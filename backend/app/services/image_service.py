import os
import uuid
import random
from pathlib import Path
from PIL import Image
from io import BytesIO
from app.config import get_settings
from app.models.analysis import ChunkResult, DiseaseClass

settings = get_settings()
CHUNK_SIZE = 256
CLASSES: list[DiseaseClass] = ["healthy", "mild_infection", "severe_infection"]


def ensure_upload_dir():
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)


def save_upload(content: bytes, filename: str) -> tuple[str, float]:
    ensure_upload_dir()
    ext = Path(filename).suffix or ".png"
    name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(settings.upload_dir, name)
    with open(path, "wb") as f:
        f.write(content)
    size_mb = len(content) / (1024 * 1024)
    return name, size_mb


def get_image_dimensions(content: bytes) -> tuple[int, int]:
    img = Image.open(BytesIO(content))
    return img.size


def simulate_chunk_and_classify(content: bytes) -> tuple[list[ChunkResult], float]:
    """Simulate: divide image into chunks and classify each (3 classes)."""
    w, h = get_image_dimensions(content)
    chunks: list[ChunkResult] = []
    for i, (y0, x0) in enumerate(
        [(y, x) for y in range(0, h, CHUNK_SIZE) for x in range(0, w, CHUNK_SIZE)]
    ):
        cw = min(CHUNK_SIZE, w - x0)
        ch = min(CHUNK_SIZE, h - y0)
        if cw <= 0 or ch <= 0:
            continue
        # Simulate classifier output (replace with real model later)
        pred = random.choice(CLASSES)
        conf = round(random.uniform(0.7, 0.99), 2)
        severity = round(random.uniform(0.0, 1.0), 2) if pred != "healthy" else 0.0
        chunks.append(
            ChunkResult(
                chunk_id=i,
                x=x0,
                y=y0,
                width=cw,
                height=ch,
                predicted_class=pred,
                confidence=conf,
                severity_score=severity if pred != "healthy" else None,
            )
        )
    # Limit chunks for large images (demo)
    if len(chunks) > 64:
        chunks = chunks[:64]
    elapsed = round(random.uniform(1.5, 4.0), 2)
    return chunks, elapsed


def compute_summary(chunks: list[ChunkResult]) -> dict:
    total = len(chunks)
    healthy = sum(1 for c in chunks if c.predicted_class == "healthy")
    mild = sum(1 for c in chunks if c.predicted_class == "mild_infection")
    severe = sum(1 for c in chunks if c.predicted_class == "severe_infection")
    health_score = round(100.0 * healthy / total, 1) if total else 0
    dominant = max(
        [("healthy", healthy), ("mild_infection", mild), ("severe_infection", severe)],
        key=lambda x: x[1],
    )[0]
    return {
        "chunks_total": total,
        "chunks_healthy": healthy,
        "chunks_mild": mild,
        "chunks_severe": severe,
        "overall_health_score": health_score,
        "dominant_class": dominant,
    }
