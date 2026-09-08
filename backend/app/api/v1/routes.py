import csv
import json
from datetime import datetime
from io import StringIO

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ...database import get_db
from ...models import Alert, DatasetImport, HistoricalLoad, ModelRun, TrainingLog, User
from ...services.forecasting import build_forecast, compare_models
from ...schemas import (
    DatasetImportResponse,
    DatasetPreviewResponse,
    DatasetQualityResponse,
    DatasetRecord,
    DatasetRecordResponse,
    ForecastHorizonResponse,
    ForecastPointResponse,
    ForecastSummaryResponse,
    PeakPredictionResponse,
    AlertResponse,
    ModelComparisonItem,
    ModelComparisonResponse,
    ModelRunResponse,
    ModelTrainingRequest,
    TrainingLogResponse,
    UserSummary,
)
from ...main import require_active_user, require_roles

router = APIRouter(prefix="/api/v1", tags=["v1"])
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
TIMESTAMP_COLUMNS = ("timestamp", "recorded_at", "datetime")
DEMAND_COLUMNS = ("demand_mw", "load_mw", "demand")


def _parse_csv(content: bytes, file_name: str) -> tuple[list[str], list[dict[str, str]], list[dict[str, object]], list[str]]:
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="CSV files must be 10 MB or smaller")
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV files must use UTF-8 encoding") from exc

    reader = csv.DictReader(StringIO(text))
    columns = [column.strip() for column in (reader.fieldnames or []) if column]
    timestamp_column = next((column for column in TIMESTAMP_COLUMNS if column in columns), None)
    demand_column = next((column for column in DEMAND_COLUMNS if column in columns), None)
    if timestamp_column is None or demand_column is None:
        missing = []
        if timestamp_column is None:
            missing.append("timestamp or recorded_at")
        if demand_column is None:
            missing.append("demand_mw or load_mw")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Missing required columns: {', '.join(missing)}")

    rows: list[dict[str, str]] = []
    valid_rows: list[dict[str, object]] = []
    errors: list[str] = []
    for row_number, row in enumerate(reader, start=2):
        clean_row = {str(key).strip(): (value or "").strip() for key, value in row.items() if key}
        rows.append(clean_row)
        try:
            recorded_at = datetime.fromisoformat(clean_row[timestamp_column].replace("Z", "+00:00"))
            demand_mw = float(clean_row[demand_column])
            if demand_mw <= 0:
                raise ValueError("demand must be greater than zero")
            valid_rows.append({"recorded_at": recorded_at, "demand_mw": demand_mw, "source": file_name})
        except (KeyError, TypeError, ValueError):
            if len(errors) < 20:
                errors.append(f"Row {row_number}: timestamp must be ISO formatted and demand must be greater than zero")

    return columns, rows, valid_rows, errors


@router.get("/users/me", response_model=UserSummary, tags=["users"])
def current_user(user: User = Depends(require_active_user)) -> UserSummary:
    return UserSummary(id=user.id, email=user.email, display_name=user.display_name, role=user.role.name)


@router.get("/datasets/quality", response_model=DatasetQualityResponse, tags=["datasets"])
def dataset_quality(
    db: Session = Depends(get_db),
    user: User = Depends(require_active_user),
) -> DatasetQualityResponse:
    total_records = db.scalar(select(func.count(HistoricalLoad.id))) or 0
    earliest_record = db.scalar(select(func.min(HistoricalLoad.recorded_at)))
    latest_record = db.scalar(select(func.max(HistoricalLoad.recorded_at)))
    missing_demand_records = db.scalar(
        select(func.count(HistoricalLoad.id)).where(HistoricalLoad.demand_mw.is_(None))
    ) or 0
    return DatasetQualityResponse(
        total_records=total_records,
        earliest_record=earliest_record,
        latest_record=latest_record,
        missing_demand_records=missing_demand_records,
    )


@router.get("/datasets/records", response_model=list[DatasetRecordResponse], tags=["datasets"])
def list_dataset_records(
    start: datetime | None = Query(default=None),
    end: datetime | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
    db: Session = Depends(get_db),
    user: User = Depends(require_active_user),
) -> list[DatasetRecordResponse]:
    statement = select(HistoricalLoad).order_by(HistoricalLoad.recorded_at.desc()).limit(limit)
    if start is not None:
        statement = statement.where(HistoricalLoad.recorded_at >= start)
    if end is not None:
        statement = statement.where(HistoricalLoad.recorded_at <= end)
    return [DatasetRecordResponse.model_validate(record) for record in db.scalars(statement).all()]


@router.post("/datasets/records", response_model=DatasetRecordResponse, status_code=201, tags=["datasets"])
def create_dataset_record(
    record: DatasetRecord,
    db: Session = Depends(get_db),
    user: User = Depends(require_active_user),
) -> DatasetRecordResponse:
    data = HistoricalLoad(**record.model_dump())
    db.add(data)
    db.commit()
    db.refresh(data)
    return DatasetRecordResponse.model_validate(data)


@router.post("/datasets/imports/preview", response_model=DatasetPreviewResponse, tags=["datasets"])
async def preview_dataset_import(
    file: UploadFile = File(...),
    user: User = Depends(require_roles("super_admin", "research_analyst")),
) -> DatasetPreviewResponse:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Upload a CSV file")
    content = await file.read()
    columns, rows, valid_rows, errors = _parse_csv(content, file.filename)
    return DatasetPreviewResponse(
        file_name=file.filename,
        columns=columns,
        sample_rows=rows[:5],
        row_count=len(rows),
        valid_rows=len(valid_rows),
        invalid_rows=len(rows) - len(valid_rows),
        errors=errors,
    )


@router.get("/datasets/imports", response_model=list[DatasetImportResponse], tags=["datasets"])
def list_dataset_imports(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "research_analyst")),
) -> list[DatasetImportResponse]:
    statement = select(DatasetImport).order_by(DatasetImport.uploaded_at.desc()).limit(limit)
    return [DatasetImportResponse.model_validate(item) for item in db.scalars(statement).all()]


@router.post("/datasets/imports", response_model=DatasetImportResponse, status_code=201, tags=["datasets"])
async def import_dataset(
    file: UploadFile = File(...),
    dataset_name: str = Form(default="Historical load"),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "research_analyst")),
) -> DatasetImportResponse:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Upload a CSV file")
    content = await file.read()
    _, rows, valid_rows, errors = _parse_csv(content, file.filename)
    invalid_rows = len(rows) - len(valid_rows)
    if invalid_rows:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Dataset rejected because it contains invalid rows", "invalid_rows": invalid_rows, "errors": errors},
        )
    if not valid_rows:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Dataset must contain at least one data row")

    latest_version = db.scalar(select(func.max(DatasetImport.version)).where(DatasetImport.dataset_name == dataset_name)) or 0
    dataset_import = DatasetImport(
        dataset_name=dataset_name.strip() or "Historical load",
        version=latest_version + 1,
        file_name=file.filename,
        status="validated",
        row_count=len(rows),
        valid_rows=len(valid_rows),
        invalid_rows=0,
        uploaded_by=user.id,
    )
    db.add(dataset_import)
    db.flush()
    db.add_all([HistoricalLoad(import_id=dataset_import.id, **row) for row in valid_rows])
    db.commit()
    db.refresh(dataset_import)
    return DatasetImportResponse.model_validate(dataset_import)


def _history_rows(db: Session) -> list[tuple[datetime, float]]:
    records = db.scalars(
        select(HistoricalLoad)
        .where(HistoricalLoad.demand_mw.is_not(None))
        .order_by(HistoricalLoad.recorded_at.asc())
    ).all()
    return [(record.recorded_at, float(record.demand_mw)) for record in records]


def _forecast_or_422(db: Session, horizon: int, model_name: str):
    try:
        return build_forecast(_history_rows(db), horizon=horizon, model_name=model_name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


def _forecast_points(result) -> list[ForecastPointResponse]:
    return [
        ForecastPointResponse(
            forecast_for=point.forecast_for,
            demand_mw=point.demand_mw,
            confidence=point.confidence,
        )
        for point in result.points
    ]


@router.get("/forecast/summary", response_model=ForecastSummaryResponse, tags=["forecast"])
def forecast_summary(
    model_name: str = Query(default="weighted_ensemble"),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "grid_operator")),
) -> ForecastSummaryResponse:
    result = _forecast_or_422(db, horizon=1, model_name=model_name)
    return ForecastSummaryResponse(
        model_name=result.model_name,
        next_forecast=_forecast_points(result)[0],
        metrics=result.metrics,
        data_points=result.data_points,
        last_observed_at=result.last_observed_at,
        last_observed_demand_mw=result.last_observed_demand_mw,
        used_fallback=result.used_fallback,
    )


@router.get("/forecast/horizon", response_model=ForecastHorizonResponse, tags=["forecast"])
def forecast_horizon(
    horizon: int = Query(default=24, ge=1, le=168),
    model_name: str = Query(default="weighted_ensemble"),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "grid_operator")),
) -> ForecastHorizonResponse:
    result = _forecast_or_422(db, horizon=horizon, model_name=model_name)
    return ForecastHorizonResponse(
        model_name=result.model_name,
        horizon=horizon,
        forecasts=_forecast_points(result),
        metrics=result.metrics,
        data_points=result.data_points,
        last_observed_at=result.last_observed_at,
        last_observed_demand_mw=result.last_observed_demand_mw,
        used_fallback=result.used_fallback,
        cadence_minutes=result.cadence_minutes,
    )


@router.get("/peak-prediction", response_model=PeakPredictionResponse, tags=["forecast"])
def peak_prediction(
    horizon: int = Query(default=24, ge=1, le=168),
    model_name: str = Query(default="weighted_ensemble"),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "grid_operator")),
) -> PeakPredictionResponse:
    result = _forecast_or_422(db, horizon=horizon, model_name=model_name)
    peak = max(result.points, key=lambda point: point.demand_mw)
    risk_threshold = result.last_observed_demand_mw * 1.05
    if peak.demand_mw >= risk_threshold:
        alert_title = f"Peak demand risk for {peak.forecast_for.date().isoformat()}"
        open_alert = db.scalar(select(Alert).where(Alert.title == alert_title, Alert.acknowledged.is_(False)))
        if open_alert is None:
            severity = "critical" if peak.demand_mw >= result.last_observed_demand_mw * 1.15 else "high"
            db.add(Alert(
                title=alert_title,
                severity=severity,
                message=f"Forecast demand reaches {peak.demand_mw:.1f} MW at {peak.forecast_for.isoformat()} with {peak.confidence:.0%} confidence.",
            ))
            db.commit()
    return PeakPredictionResponse(
        model_name=result.model_name,
        peak_for=peak.forecast_for,
        peak_demand_mw=peak.demand_mw,
        horizon=horizon,
        confidence=peak.confidence,
        metrics=result.metrics,
        used_fallback=result.used_fallback,
    )


@router.get("/alerts", response_model=list[AlertResponse], tags=["alerts"])
def list_alerts(
    acknowledged: bool | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "grid_operator")),
) -> list[AlertResponse]:
    statement = select(Alert).order_by(Alert.created_at.desc()).limit(limit)
    if acknowledged is not None:
        statement = statement.where(Alert.acknowledged == acknowledged)
    return [AlertResponse.model_validate(alert) for alert in db.scalars(statement).all()]


@router.post("/alerts/{alert_id}/acknowledge", response_model=AlertResponse, tags=["alerts"])
def acknowledge_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "grid_operator")),
) -> AlertResponse:
    alert = db.get(Alert, alert_id)
    if alert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    alert.acknowledged = True
    db.commit()
    db.refresh(alert)
    return AlertResponse.model_validate(alert)


def _model_run_response(run: ModelRun) -> ModelRunResponse:
    try:
        metrics = json.loads(run.metrics_json)
    except (TypeError, json.JSONDecodeError):
        metrics = {}
    return ModelRunResponse(
        id=run.id,
        model_name=run.model_name,
        algorithm=run.algorithm,
        status=run.status,
        metrics=metrics,
        data_points=run.data_points,
        trained_at=run.trained_at,
        created_by=run.created_by,
    )


@router.post("/models/training", response_model=ModelRunResponse, status_code=201, tags=["models"])
@router.post("/models/train", response_model=ModelRunResponse, status_code=201, tags=["models"])
def train_model(
    request: ModelTrainingRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "research_analyst")),
) -> ModelRunResponse:
    try:
        result = build_forecast(_history_rows(db), horizon=1, model_name=request.model_name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    run = ModelRun(
        model_name=result.model_name,
        algorithm=result.model_name,
        status="completed",
        metrics_json=json.dumps(result.metrics, sort_keys=True),
        data_points=result.data_points,
        created_by=user.id,
    )
    db.add(run)
    db.flush()
    db.add(TrainingLog(
        model_run_id=run.id,
        level="info",
        message=f"Deterministic {result.model_name} training completed on {result.data_points} observations",
    ))
    db.commit()
    db.refresh(run)
    return _model_run_response(run)


@router.get("/models/runs", response_model=list[ModelRunResponse], tags=["models"])
def list_model_runs(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "research_analyst")),
) -> list[ModelRunResponse]:
    statement = select(ModelRun).order_by(ModelRun.trained_at.desc()).limit(limit)
    return [_model_run_response(run) for run in db.scalars(statement).all()]


@router.get("/models/runs/{run_id}/logs", response_model=list[TrainingLogResponse], tags=["models"])
def list_training_logs(
    run_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "research_analyst")),
) -> list[TrainingLogResponse]:
    if db.get(ModelRun, run_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model run not found")
    statement = select(TrainingLog).where(TrainingLog.model_run_id == run_id).order_by(TrainingLog.created_at.asc())
    return [TrainingLogResponse.model_validate(log) for log in db.scalars(statement).all()]


@router.get("/models/comparison", response_model=ModelComparisonResponse, tags=["models"])
@router.get("/models/compare", response_model=ModelComparisonResponse, tags=["models"])
def compare_model_metadata(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "research_analyst")),
) -> ModelComparisonResponse:
    rows = _history_rows(db)
    comparison = compare_models(rows)
    return ModelComparisonResponse(
        models=[ModelComparisonItem.model_validate(item) for item in comparison],
        data_points=build_forecast(rows, horizon=1).data_points,
        used_fallback=not rows,
    )
