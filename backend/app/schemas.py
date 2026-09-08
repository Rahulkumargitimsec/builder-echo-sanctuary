from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    display_name: str
    role: str


class DatasetRecord(BaseModel):
    recorded_at: datetime
    demand_mw: float = Field(gt=0)
    source: str = Field(default="manual", min_length=1, max_length=80)


class DatasetRecordResponse(DatasetRecord):
    id: int
    model_config = ConfigDict(from_attributes=True)


class DatasetQualityResponse(BaseModel):
    total_records: int
    earliest_record: datetime | None
    latest_record: datetime | None
    missing_demand_records: int


class DatasetImportResponse(BaseModel):
    id: int
    dataset_name: str
    version: int
    file_name: str
    status: str
    row_count: int
    valid_rows: int
    invalid_rows: int
    uploaded_at: datetime
    model_config = ConfigDict(from_attributes=True)


class DatasetPreviewResponse(BaseModel):
    file_name: str
    columns: list[str]
    sample_rows: list[dict[str, str]]
    row_count: int
    valid_rows: int
    invalid_rows: int
    errors: list[str]


class ForecastSummary(BaseModel):
    forecast_for: datetime
    demand_mw: float
    confidence: float | None = Field(default=None, ge=0, le=1)
    model_name: str


class HealthResponse(BaseModel):
    status: str
    service: str
    database: str
