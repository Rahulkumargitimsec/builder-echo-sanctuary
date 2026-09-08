from datetime import datetime
from typing import Literal

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


class ExplanationRequest(BaseModel):
    model_name: str = Field(default="weighted_ensemble", min_length=1, max_length=80)
    horizon: int = Field(default=1, ge=1, le=168)


class ExplainabilityResponse(BaseModel):
    id: int
    prediction_id: int
    model_name: str
    forecast_for: datetime
    predicted_demand_mw: float
    feature_contributions: dict[str, float]
    explanation: str
    created_by: str
    created_at: datetime


class RecommendationCreate(BaseModel):
    category: str = Field(min_length=1, max_length=60)
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    action: str = Field(min_length=1, max_length=2000)
    expected_reduction_mw: float | None = Field(default=None, ge=0)
    expected_savings: float | None = Field(default=None, ge=0)
    time_window: str = Field(min_length=1, max_length=120)
    confidence: float = Field(default=0.5, ge=0, le=1)
    reason: str = Field(min_length=1, max_length=2000)


class RecommendationStatusUpdate(BaseModel):
    status: Literal["open", "accepted", "rejected", "completed"]


class RecommendationResponse(RecommendationCreate):
    id: int
    status: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ReportGenerateRequest(BaseModel):
    type: Literal["forecast", "recommendations", "model_comparison", "audit"] = "forecast"
    format: Literal["json", "csv"] = "json"
    horizon: int = Field(default=24, ge=1, le=168)
    model_name: str = Field(default="weighted_ensemble", min_length=1, max_length=80)


class ReportResponse(BaseModel):
    id: int
    type: str
    format: str
    status: str
    generated_by: str
    created_at: datetime
    content: str
    model_config = ConfigDict(from_attributes=True)


class ExperimentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    dataset_version: str | None = Field(default=None, max_length=80)
    parameters: dict[str, str | int | float | bool] = Field(default_factory=dict)


class ResearchResultResponse(BaseModel):
    id: int
    experiment_id: int
    model_name: str
    metrics: dict[str, float]
    reproducibility: dict[str, str | int | float | bool]
    created_at: datetime


class ExperimentResponse(BaseModel):
    id: int
    name: str
    dataset_version: str | None
    parameters: dict[str, str | int | float | bool]
    status: str
    created_by: str
    created_at: datetime
    results: list[ResearchResultResponse] = Field(default_factory=list)


class AuditLogResponse(BaseModel):
    id: int
    actor_id: str | None
    action: str
    resource_type: str
    resource_id: str | None
    details: dict[str, object]
    created_at: datetime


class AdminUserResponse(UserSummary):
    is_active: bool
    created_at: datetime


class SystemSettingResponse(BaseModel):
    key: str
    value: str
    updated_by: str
    updated_at: datetime


class SystemSettingUpdate(BaseModel):
    value: str = Field(max_length=4000)
