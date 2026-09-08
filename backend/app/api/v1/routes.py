import csv
from datetime import datetime
from io import StringIO

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ...database import get_db
from ...models import DatasetImport, HistoricalLoad, User
from ...schemas import (
    DatasetImportResponse,
    DatasetPreviewResponse,
    DatasetQualityResponse,
    DatasetRecord,
    DatasetRecordResponse,
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
