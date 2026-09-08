import csv
import hashlib
import json
from datetime import datetime, timezone
from io import StringIO
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ...database import get_db
from ...models import (
    Alert,
    AuditLog,
    DatasetImport,
    Experiment,
    ExplainabilityResult,
    HistoricalLoad,
    ModelRun,
    Prediction,
    Recommendation,
    Report,
    ResearchResult,
    SystemSetting,
    TrainingLog,
    User,
)
from ...services.forecasting import build_forecast, compare_models
from ...schemas import (
    AdminUserResponse,
    AuditLogResponse,
    DatasetImportResponse,
    DatasetPreviewResponse,
    DatasetQualityResponse,
    DatasetRecord,
    DatasetRecordResponse,
    ForecastHorizonResponse,
    ForecastPointResponse,
    ExperimentCreate,
    ExperimentResponse,
    ExplainabilityResponse,
    ExplanationRequest,
    ForecastSummaryResponse,
    PeakPredictionResponse,
    AlertResponse,
    ModelComparisonItem,
    ModelComparisonResponse,
    ModelRunResponse,
    ModelTrainingRequest,
    RecommendationCreate,
    RecommendationResponse,
    RecommendationStatusUpdate,
    ReportGenerateRequest,
    ReportResponse,
    ResearchResultResponse,
    SystemSettingResponse,
    SystemSettingUpdate,
    TrainingLogResponse,
    UserSummary,
)
from ...main import require_active_user, require_roles

router = APIRouter(prefix="/api/v1", tags=["v1"])
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
TIMESTAMP_COLUMNS = ("timestamp", "recorded_at", "datetime")
DEMAND_COLUMNS = ("demand_mw", "load_mw", "demand")


def _audit(db: Session, user: User, action: str, resource_type: str, resource_id: str | None = None, details: dict[str, object] | None = None) -> None:
    db.add(AuditLog(actor_id=user.id, action=action, resource_type=resource_type, resource_id=resource_id, details_json=json.dumps(details or {}, sort_keys=True, default=str)))


def _json_object(raw: str | None) -> dict:
    try:
        value = json.loads(raw or "{}")
    except json.JSONDecodeError:
        return {}
    return value if isinstance(value, dict) else {}


def _explanation_response(item: ExplainabilityResult, prediction: Prediction) -> ExplainabilityResponse:
    return ExplainabilityResponse(id=item.id, prediction_id=item.prediction_id, model_name=item.model_name, forecast_for=prediction.forecast_for, predicted_demand_mw=float(prediction.demand_mw or 0), feature_contributions=_json_object(item.feature_contributions_json), explanation=item.explanation, created_by=item.created_by, created_at=item.created_at)


def _recommendation_response(item: Recommendation) -> RecommendationResponse:
    return RecommendationResponse(id=item.id, category=item.category, priority=item.priority, action=item.action, expected_reduction_mw=item.expected_reduction_mw, expected_savings=item.expected_savings, time_window=item.time_window, confidence=item.confidence, reason=item.reason, status=item.status, created_by=item.created_by, created_at=item.created_at, updated_at=item.updated_at)


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
    _audit(db, user, "dataset_import", "dataset_import", str(dataset_import.id), {"file_name": file.filename, "row_count": len(valid_rows)})
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
    _audit(db, user, "model_training", "model_run", str(run.id), {"model_name": result.model_name, "data_points": result.data_points})
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
# Phase 9: deterministic forecast explanations
@router.post("/explanations/forecast", response_model=ExplainabilityResponse, status_code=201, tags=["explainability"])
@router.post("/explanations", response_model=ExplainabilityResponse, status_code=201, tags=["explainability"])
def create_forecast_explanation(
    request: ExplanationRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "grid_operator", "research_analyst")),
) -> ExplainabilityResponse:
    result = _forecast_or_422(db, horizon=request.horizon, model_name=request.model_name)
    point = result.points[0]
    recent_values = [value for _, value in _history_rows(db)][-3:]
    recent_average = sum(recent_values) / len(recent_values) if recent_values else result.last_observed_demand_mw
    contributions = {
        "recent_load": round(result.last_observed_demand_mw, 3),
        "recent_average_delta": round(recent_average - result.last_observed_demand_mw, 3),
        "trend": round(point.demand_mw - result.last_observed_demand_mw, 3),
        "model_uncertainty": round(1.0 - point.confidence, 3),
    }
    direction = "increase" if point.demand_mw >= result.last_observed_demand_mw else "decrease"
    explanation = (
        f"The {result.model_name} forecast expects {point.demand_mw:.1f} MW at "
        f"{point.forecast_for.isoformat()}, a {direction} from the latest observed "
        f"{result.last_observed_demand_mw:.1f} MW. Recent load and trend contributed "
        f"most to this deterministic estimate; confidence is {point.confidence:.0%}."
    )
    prediction = Prediction(
        forecast_for=point.forecast_for,
        demand_mw=point.demand_mw,
        confidence=point.confidence,
        model_name=result.model_name,
        created_by=user.id,
    )
    db.add(prediction)
    db.flush()
    item = ExplainabilityResult(
        prediction_id=prediction.id,
        model_name=result.model_name,
        feature_contributions_json=json.dumps(contributions, sort_keys=True),
        explanation=explanation,
        created_by=user.id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    db.refresh(prediction)
    return _explanation_response(item, prediction)


@router.get("/explanations", response_model=list[ExplainabilityResponse], tags=["explainability"])
@router.get("/explanations/history", response_model=list[ExplainabilityResponse], tags=["explainability"])
def list_explanations(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "grid_operator", "research_analyst")),
) -> list[ExplainabilityResponse]:
    rows = db.execute(
        select(ExplainabilityResult, Prediction)
        .join(Prediction, Prediction.id == ExplainabilityResult.prediction_id)
        .order_by(ExplainabilityResult.created_at.desc())
        .limit(limit)
    ).all()
    return [_explanation_response(item, prediction) for item, prediction in rows]


# Phase 10: operational recommendations
@router.get("/recommendations", response_model=list[RecommendationResponse], tags=["recommendations"])
def list_recommendations(
    status_filter: Literal["open", "accepted", "rejected", "completed"] | None = Query(default=None, alias="status"),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "grid_operator")),
) -> list[RecommendationResponse]:
    statement = select(Recommendation).order_by(Recommendation.created_at.desc()).limit(limit)
    if status_filter is not None:
        statement = statement.where(Recommendation.status == status_filter)
    return [_recommendation_response(item) for item in db.scalars(statement).all()]


@router.post("/recommendations", response_model=RecommendationResponse, status_code=201, tags=["recommendations"])
def create_recommendation(
    request: RecommendationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "grid_operator")),
) -> RecommendationResponse:
    item = Recommendation(created_by=user.id, **request.model_dump())
    db.add(item)
    db.flush()
    _audit(db, user, "recommendation_created", "recommendation", str(item.id), {"status": item.status})
    db.commit()
    db.refresh(item)
    return _recommendation_response(item)


@router.patch("/recommendations/{recommendation_id}/status", response_model=RecommendationResponse, tags=["recommendations"])
@router.put("/recommendations/{recommendation_id}/status", response_model=RecommendationResponse, tags=["recommendations"])
def update_recommendation_status(
    recommendation_id: int,
    request: RecommendationStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "grid_operator")),
) -> RecommendationResponse:
    item = db.get(Recommendation, recommendation_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")
    item.status = request.status
    item.updated_at = datetime.now(timezone.utc)
    _audit(db, user, "recommendation_updated", "recommendation", str(item.id), {"status": item.status})
    db.commit()
    db.refresh(item)
    return _recommendation_response(item)


# Phase 11: persisted reports and safe exports
@router.get("/reports", response_model=list[ReportResponse], tags=["reports"])
def list_reports(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "grid_operator", "research_analyst")),
) -> list[ReportResponse]:
    statement = select(Report).order_by(Report.created_at.desc()).limit(limit)
    return [ReportResponse.model_validate(item) for item in db.scalars(statement).all()]


def _report_payload(request: ReportGenerateRequest, db: Session, user: User) -> object:
    if request.type == "forecast":
        result = _forecast_or_422(db, request.horizon, request.model_name)
        return {
            "model_name": result.model_name,
            "metrics": result.metrics,
            "data_points": result.data_points,
            "forecasts": [{"forecast_for": point.forecast_for.isoformat(), "demand_mw": point.demand_mw, "confidence": point.confidence} for point in result.points],
        }
    if request.type == "recommendations":
        return [{"id": item.id, "category": item.category, "priority": item.priority, "action": item.action, "status": item.status, "confidence": item.confidence} for item in db.scalars(select(Recommendation).order_by(Recommendation.created_at.desc()).limit(500)).all()]
    if request.type == "model_comparison":
        return {"models": compare_models(_history_rows(db)), "data_points": len(_history_rows(db))}
    if user.role.name not in ("super_admin", "research_analyst"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Audit reports require an admin or research role")
    return [{"action": item.action, "resource_type": item.resource_type, "resource_id": item.resource_id, "created_at": item.created_at.isoformat()} for item in db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(500)).all()]


def _format_report(payload: object, report_format: str) -> str:
    if report_format == "json":
        return json.dumps(payload, sort_keys=True, indent=2, default=str)
    if not isinstance(payload, list):
        payload = [payload]
    rows = payload if payload else [{}]
    columns = sorted({key for row in rows if isinstance(row, dict) for key in row})
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=columns or ["value"])
    writer.writeheader()
    for row in rows:
        writer.writerow(row if isinstance(row, dict) else {"value": row})
    return output.getvalue()


@router.post("/reports/generate", response_model=ReportResponse, status_code=201, tags=["reports"])
def generate_report(
    request: ReportGenerateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "research_analyst")),
) -> ReportResponse:
    payload = _report_payload(request, db, user)
    report = Report(type=request.type, format=request.format, status="completed", generated_by=user.id, content=_format_report(payload, request.format))
    db.add(report)
    db.flush()
    _audit(db, user, "report_generated", "report", str(report.id), {"type": report.type, "format": report.format})
    db.commit()
    db.refresh(report)
    return ReportResponse.model_validate(report)


@router.get("/reports/{report_id}/export", tags=["reports"])
def export_report(
    report_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "grid_operator", "research_analyst")),
) -> Response:
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    media_type = "application/json" if report.format == "json" else "text/csv"
    extension = "json" if report.format == "json" else "csv"
    return Response(content=report.content, media_type=media_type, headers={"Content-Disposition": f'attachment; filename="gridsense-report-{report.id}.{extension}"'})


# Phase 12: reproducible deterministic research and administration

def _research_result_response(item: ResearchResult) -> ResearchResultResponse:
    return ResearchResultResponse(id=item.id, experiment_id=item.experiment_id, model_name=item.model_name, metrics=_json_object(item.metrics_json), reproducibility=_json_object(item.reproducibility_json), created_at=item.created_at)


def _experiment_response(item: Experiment, results: list[ResearchResult]) -> ExperimentResponse:
    return ExperimentResponse(id=item.id, name=item.name, dataset_version=item.dataset_version, parameters=_json_object(item.parameters_json), status=item.status, created_by=item.created_by, created_at=item.created_at, results=[_research_result_response(result) for result in results])


@router.post("/research/experiments", response_model=ExperimentResponse, status_code=201, tags=["research"])
def create_experiment(
    request: ExperimentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "research_analyst")),
) -> ExperimentResponse:
    item = Experiment(name=request.name, dataset_version=request.dataset_version, parameters_json=json.dumps(request.parameters, sort_keys=True), created_by=user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return _experiment_response(item, [])


@router.get("/research/experiments", response_model=list[ExperimentResponse], tags=["research"])
def list_experiments(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "research_analyst")),
) -> list[ExperimentResponse]:
    experiments = db.scalars(select(Experiment).order_by(Experiment.created_at.desc()).limit(limit)).all()
    return [_experiment_response(item, db.scalars(select(ResearchResult).where(ResearchResult.experiment_id == item.id).order_by(ResearchResult.created_at.asc())).all()) for item in experiments]


@router.post("/research/experiments/{experiment_id}/run", response_model=ExperimentResponse, tags=["research"])
def run_experiment(
    experiment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "research_analyst")),
) -> ExperimentResponse:
    item = db.get(Experiment, experiment_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Experiment not found")
    rows = _history_rows(db)
    fingerprint = hashlib.sha256(json.dumps([(timestamp.isoformat(), value) for timestamp, value in rows], sort_keys=True).encode()).hexdigest()
    for comparison in compare_models(rows):
        db.add(ResearchResult(experiment_id=item.id, model_name=comparison["model_name"], metrics_json=json.dumps(comparison["metrics"], sort_keys=True), reproducibility_json=json.dumps({"data_fingerprint": fingerprint, "algorithm": "pure_python_forecasting", "data_points": len(rows)}, sort_keys=True)))
    item.status = "completed"
    _audit(db, user, "research_experiment_run", "experiment", str(item.id), {"data_fingerprint": fingerprint, "data_points": len(rows)})
    db.commit()
    db.refresh(item)
    results = db.scalars(select(ResearchResult).where(ResearchResult.experiment_id == item.id).order_by(ResearchResult.created_at.asc())).all()
    return _experiment_response(item, results)


@router.get("/research/experiments/{experiment_id}/results", response_model=list[ResearchResultResponse], tags=["research"])
def list_research_results(
    experiment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "research_analyst")),
) -> list[ResearchResultResponse]:
    if db.get(Experiment, experiment_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Experiment not found")
    return [_research_result_response(item) for item in db.scalars(select(ResearchResult).where(ResearchResult.experiment_id == experiment_id).order_by(ResearchResult.created_at.asc())).all()]


@router.get("/admin/users", response_model=list[AdminUserResponse], tags=["admin"])
def admin_users(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin")),
) -> list[AdminUserResponse]:
    return [AdminUserResponse(id=item.id, email=item.email, display_name=item.display_name, role=item.role.name, is_active=item.is_active, created_at=item.created_at) for item in db.scalars(select(User).order_by(User.created_at.asc())).all()]


@router.patch("/admin/users/{user_id}/active", response_model=AdminUserResponse, tags=["admin"])
@router.patch("/admin/users/{user_id}/toggle", response_model=AdminUserResponse, tags=["admin"])
def set_user_active(
    user_id: str,
    active: bool = Query(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin")),
) -> AdminUserResponse:
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if target.id == user.id and not active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate your own account")
    target.is_active = active
    _audit(db, user, "user_status_changed", "user", target.id, {"is_active": active})
    db.commit()
    db.refresh(target)
    return AdminUserResponse(id=target.id, email=target.email, display_name=target.display_name, role=target.role.name, is_active=target.is_active, created_at=target.created_at)


@router.get("/admin/audit-logs", response_model=list[AuditLogResponse], tags=["admin"])
def admin_audit_logs(
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin")),
) -> list[AuditLogResponse]:
    return [AuditLogResponse(id=item.id, actor_id=item.actor_id, action=item.action, resource_type=item.resource_type, resource_id=item.resource_id, details=_json_object(item.details_json), created_at=item.created_at) for item in db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)).all()]


@router.get("/admin/settings", response_model=list[SystemSettingResponse], tags=["admin"])
def list_system_settings(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin")),
) -> list[SystemSettingResponse]:
    return [SystemSettingResponse(key=item.key, value=item.value, updated_by=item.updated_by, updated_at=item.updated_at) for item in db.scalars(select(SystemSetting).order_by(SystemSetting.key.asc())).all()]


@router.put("/admin/settings/{key}", response_model=SystemSettingResponse, tags=["admin"])
def update_system_setting(
    key: str,
    request: SystemSettingUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin")),
) -> SystemSettingResponse:
    clean_key = key.strip()
    if not clean_key or len(clean_key) > 100:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Setting key must be 1-100 characters")
    item = db.scalar(select(SystemSetting).where(SystemSetting.key == clean_key))
    if item is None:
        item = SystemSetting(key=clean_key, value=request.value, updated_by=user.id)
        db.add(item)
    else:
        item.value = request.value
        item.updated_by = user.id
        item.updated_at = datetime.now(timezone.utc)
    db.flush()
    _audit(db, user, "setting_changed", "system_setting", clean_key, {"value_length": len(request.value)})
    db.commit()
    db.refresh(item)
    return SystemSettingResponse(key=item.key, value=item.value, updated_by=item.updated_by, updated_at=item.updated_at)
