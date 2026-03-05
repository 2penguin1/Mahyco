import os
import uuid
import random
import time
import re
from pathlib import Path
from PIL import Image
from io import BytesIO
from fastapi import UploadFile
from app.config import get_settings
from app.models.analysis import ChunkResult, DiseaseClass
import importlib.util

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


def save_upload_stream(upload: UploadFile, filename: str) -> tuple[str, float]:
    """
    Save an UploadFile to disk by streaming, to avoid loading huge files (e.g. multi-GB TIFF) into memory.
    """
    ensure_upload_dir()
    ext = Path(filename).suffix or ".bin"
    name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(settings.upload_dir, name)
    size = 0
    with open(path, "wb") as f:
        for chunk in iter(lambda: upload.file.read(1024 * 1024), b""):
            f.write(chunk)
            size += len(chunk)
    size_mb = size / (1024 * 1024)
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
    return chunks


def _map_label_to_class(label: str) -> tuple[DiseaseClass, float | None]:
    # website_integration classifier labels
    if label.lower() == "healthy":
        return "healthy", None
    if label.lower() == "partial":
        return "mild_infection", 0.5
    # rejected -> severe
    return "severe_infection", 1.0


def _parse_classification_outputs(crops_dir: Path) -> dict[int, tuple[str, float]]:
    """
    Build mapping: row_index -> (label, confidence)

    The classifier saves crops like:
      crops/Healthy/plant_{index}_Healthy_{confidence:.2f}.jpg
    """
    mapping: dict[int, tuple[str, float]] = {}
    if not crops_dir.exists():
        return mapping

    pat = re.compile(r"plant_(\d+)_([A-Za-z]+)_([0-9]+\.[0-9]+)\.jpg$", re.IGNORECASE)
    for p in crops_dir.rglob("plant_*.jpg"):
        m = pat.search(p.name)
        if not m:
            continue
        idx = int(m.group(1))
        label = m.group(2)
        conf = float(m.group(3))
        prev = mapping.get(idx)
        if prev is None or conf > prev[1]:
            mapping[idx] = (label, conf)
    return mapping


def _chunks_from_detected_csv_and_crops(detected_csv: Path, crops_dir: Path) -> list[ChunkResult]:
    """
    Returns ChunkResult list compatible with the current dashboard.
    """
    idx_to_pred = _parse_classification_outputs(crops_dir)

    # Parse CSV and build chunk results
    chunks: list[ChunkResult] = []
    with open(detected_csv, "r", newline="") as f:
        # ID,x_min,y_min,x_max,y_max
        lines = f.read().splitlines()
    # skip header
    rows = lines[1:] if len(lines) > 1 else []
    for row_idx, line in enumerate(rows):
        parts = [p.strip() for p in line.split(",")]
        if len(parts) < 5:
            continue
        try:
            chunk_id = int(parts[0])
            x1, y1, x2, y2 = map(int, parts[1:5])
        except Exception:
            continue

        label, conf = idx_to_pred.get(row_idx, ("Healthy", 0.0))
        predicted_class, severity_score = _map_label_to_class(label)

        chunks.append(
            ChunkResult(
                chunk_id=chunk_id,
                x=x1,
                y=y1,
                width=max(0, x2 - x1),
                height=max(0, y2 - y1),
                predicted_class=predicted_class,
                confidence=float(conf),
                severity_score=severity_score,
            )
        )

    return chunks


def _load_module_from_path(module_name: str, path: str):
    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load module {module_name} from {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _run_local_model(saved_path: str) -> tuple[list[ChunkResult], float]:
    """
    Run website_integration's YOLO + EfficientNet directly on the saved image path.
    This avoids re-uploading the image and lets the model read the .tif from disk.
    """
    if not settings.website_integration_dir:
        raise RuntimeError("WEBSITE_INTEGRATION_DIR is not set in backend .env")

    wi_dir = Path(settings.website_integration_dir)
    scripts_dir = wi_dir / "scripts"
    yolo_path = scripts_dir / "yolo_wrapper.py"
    cls_path = scripts_dir / "classify_wrapper.py"
    if not yolo_path.exists() or not cls_path.exists():
        raise RuntimeError(f"website_integration scripts not found under {scripts_dir}")

    yolo_mod = _load_module_from_path("wi_yolo_wrapper", str(yolo_path))
    cls_mod = _load_module_from_path("wi_classify_wrapper", str(cls_path))

    upload_dir = wi_dir / "uploads"
    upload_dir.mkdir(exist_ok=True)

    # Match website_integration/app.py output layout
    out_csv = upload_dir / "detected.csv"
    out_visual = upload_dir / "visual.jpg"
    classified_visual = upload_dir / "classified.jpg"
    crops_dir = upload_dir / "crops"

    t0 = time.perf_counter()
    yolo_mod.run_yolo(str(saved_path), str(out_csv), str(out_visual))
    cls_mod.run_classification(str(saved_path), str(out_csv), str(crops_dir), str(classified_visual))
    elapsed = round(time.perf_counter() - t0, 2)

    chunks = _chunks_from_detected_csv_and_crops(out_csv, crops_dir)
    return chunks, elapsed


async def run_model(content: bytes, saved_path: str) -> tuple[list[ChunkResult], float]:
    """
    Main entrypoint used by the upload endpoint.

    - If WEBSITE_INTEGRATION_DIR is set, run the local model code directly using the saved image path.
    - Otherwise, fall back to simulation.
    """
    if settings.website_integration_dir:
        return _run_local_model(saved_path)
    # Fallback demo mode
    chunks = simulate_chunk_and_classify(content)
    # simulate_chunk_and_classify currently doesn't compute elapsed; approximate
    return chunks, 0.0


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
