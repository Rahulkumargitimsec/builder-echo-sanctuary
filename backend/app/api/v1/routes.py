from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ...database import get_db
from ...models import HistoricalLoad, User
from ...schemas import DatasetQualityResponse, DatasetRecord, DatasetRecordResponse, UserSummary
from ...main import require_active_user

router = APIRouter(prefix="/api/v1", tags=["v1"])


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
