from pydantic import BaseModel
from typing import Literal
from datetime import datetime

DiseaseClass = Literal["healthy", "mild_infection", "severe_infection"]


class ChunkResult(BaseModel):
    chunk_id: int
    x: int
    y: int
    width: int
    height: int
    predicted_class: DiseaseClass
    confidence: float
    severity_score: float | None = None


class AnalysisResult(BaseModel):
    analysis_id: str
    user_id: str
    original_filename: str
    image_size_mb: float
    chunks_total: int
    chunks_healthy: int
    chunks_mild: int
    chunks_severe: int
    overall_health_score: float  # 0-100
    dominant_class: DiseaseClass
    chunk_results: list[ChunkResult]
    processing_time_seconds: float
    created_at: datetime


class AnalysisCreate(BaseModel):
    filename: str
    file_size: int


class AnalysisListItem(BaseModel):
    id: str
    original_filename: str
    overall_health_score: float
    dominant_class: DiseaseClass
    created_at: datetime
