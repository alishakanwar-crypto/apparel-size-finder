from pydantic import BaseModel, Field
from typing import Optional


class SizeCreate(BaseModel):
    name: str = Field(..., example="M")
    chest_min: float = Field(..., ge=0, example=38)
    chest_max: float = Field(..., ge=0, example=40)
    shoulder: float = Field(..., ge=0, example=17.5)
    sleeve_length: float = Field(..., ge=0, example=25)
    body_length: float = Field(..., ge=0, example=28)
    waist_min: float = Field(..., ge=0, example=32)
    waist_max: float = Field(..., ge=0, example=34)


class SizeUpdate(BaseModel):
    name: Optional[str] = None
    chest_min: Optional[float] = Field(None, ge=0)
    chest_max: Optional[float] = Field(None, ge=0)
    shoulder: Optional[float] = Field(None, ge=0)
    sleeve_length: Optional[float] = Field(None, ge=0)
    body_length: Optional[float] = Field(None, ge=0)
    waist_min: Optional[float] = Field(None, ge=0)
    waist_max: Optional[float] = Field(None, ge=0)


class SizeResponse(BaseModel):
    id: int
    name: str
    chest_min: float
    chest_max: float
    shoulder: float
    sleeve_length: float
    body_length: float
    waist_min: float
    waist_max: float


class MeasurementInput(BaseModel):
    name: str = Field(..., example="Rahul Sharma")
    phone: Optional[str] = Field(None, example="9876543210")
    chest: float = Field(..., ge=0, example=39)
    shoulder: float = Field(..., ge=0, example=17)
    sleeve_length: float = Field(..., ge=0, example=25)
    body_length: float = Field(..., ge=0, example=28)
    waist: float = Field(..., ge=0, example=33)


class SizeRecommendation(BaseModel):
    recommended_size: str
    fit_score: float
    fit_label: str
    all_scores: list[dict]
    customer_id: int


class CustomerRecord(BaseModel):
    id: int
    name: str
    phone: Optional[str]
    chest: float
    shoulder: float
    sleeve_length: float
    body_length: float
    waist: float
    recommended_size: Optional[str]
    fit_score: Optional[float]
    created_at: str


# ── AI / Calibration Models ──────────────────────────────────────────────────


class CalibrationCreate(BaseModel):
    name: str = Field(default="default", example="Shop Entrance Dummy")
    chest_real: float = Field(..., ge=0, example=40.0)
    shoulder_real: float = Field(..., ge=0, example=18.0)
    torso_real: float = Field(..., ge=0, example=18.0)
    image_data: str = Field(..., description="Base64-encoded image of the calibration dummy")


class CalibrationResponse(BaseModel):
    id: int
    name: str
    chest_real: float
    shoulder_real: float
    torso_real: float
    shoulder_px: Optional[float]
    torso_px: Optional[float]
    chest_px: Optional[float]
    pixels_per_inch: Optional[float]
    is_active: bool


class AIImageInput(BaseModel):
    image_data: str = Field(..., description="Base64-encoded customer image")
    customer_name: str = Field(default="Walk-in Customer")
    customer_phone: Optional[str] = None


class AIEstimatedMeasurements(BaseModel):
    chest: float
    shoulder: float
    sleeve_length: float
    body_length: float
    waist: float


class AISizeRecommendation(BaseModel):
    estimated_measurements: AIEstimatedMeasurements
    best_fit: dict
    comfort_fit: Optional[dict]
    all_scores: list[dict]
    annotated_image: str
    customer_id: int
    confidence_note: str
