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


class ForecastPointResponse(BaseModel):
    forecast_for: datetime
    demand_mw: float
    confidence: float = Field(ge=0, le=1)


class ForecastHorizonResponse(BaseModel):
    model_name: str
    horizon: int
    forecasts: list[ForecastPointResponse]
    metrics: dict[str, float]
    data_points: int
    last_observed_at: datetime
    last_observed_demand_mw: float
    used_fallback: bool
    cadence_minutes: int


class ForecastSummaryResponse(BaseModel):
    model_name: str
    next_forecast: ForecastPointResponse
    metrics: dict[str, float]
    data_points: int
    last_observed_at: datetime
    last_observed_demand_mw: float
    used_fallback: bool


class PeakPredictionResponse(BaseModel):
    model_name: str
    peak_for: datetime
    peak_demand_mw: float
    horizon: int
    confidence: float = Field(ge=0, le=1)
    metrics: dict[str, float]
    used_fallback: bool


class AlertResponse(BaseModel):
    id: int
    title: str
    severity: str
    message: str
    acknowledged: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ModelTrainingRequest(BaseModel):
    model_name: str = Field(default="weighted_ensemble", min_length=1, max_length=80)


class ModelRunResponse(BaseModel):
    id: int
    model_name: str
    algorithm: str
    status: str
    metrics: dict[str, float]
    data_points: int
    trained_at: datetime
    created_by: str


class TrainingLogResponse(BaseModel):
    id: int
    model_run_id: int
    level: str
    message: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ModelComparisonItem(BaseModel):
    model_name: str
    metrics: dict[str, float]
    forecast_demand_mw: float


class ModelComparisonResponse(BaseModel):
    models: list[ModelComparisonItem]
    data_points: int
    used_fallback: bool
