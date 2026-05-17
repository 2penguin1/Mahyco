import os
import uuid
import random
import time
import re
from pathlib import Path
from PIL import Image
Image.MAX_IMAGE_PIXELS = None  # Allow massive drone images (disable decompression bomb check)
from io import BytesIO
from fastapi import UploadFile
from app.config import get_settings
from app.models.analysis import ChunkResult, DiseaseClass
from app.logger import get_logger
import importlib.util

log = get_logger(__name__)
settings = get_settings()
CHUNK_SIZE = 256
CLASSES: list[DiseaseClass] = ["healthy", "mild_infection", "severe_infection"]

# ── Device selection ─────────────────────────────────────────────────────────
try:
    import torch
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    if DEVICE == "cuda":
        _props = torch.cuda.get_device_properties(0)
        log.info(
            f"Compute device: CUDA ✅ — {torch.cuda.get_device_name(0)} "
            f"| VRAM {_props.total_memory // 1024**2} MB "
            f"| PyTorch {torch.__version__}"
        )
    else:
        log.warning(
            f"Compute device: CPU ⚠️  — CUDA not available. "
            f"PyTorch {torch.__version__}. Install torch+cu121 for GPU acceleration."
        )
except ImportError:
    DEVICE = "cpu"
    log.error("torch is not installed — image_service will run in CPU/simulation mode")



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
    log.debug(f"Saved upload '{filename}' → '{name}' ({size_mb:.2f} MB)")
    return name, size_mb


def save_upload_stream(upload: UploadFile, filename: str, save_dir: str | None = None) -> tuple[str, float]:
    """
    Save an UploadFile to disk by streaming.
    If save_dir is provided, save there; otherwise use the default upload_dir.
    """
    target_dir = save_dir if save_dir else settings.upload_dir
    Path(target_dir).mkdir(parents=True, exist_ok=True)
    ext = Path(filename).suffix or ".bin"
    name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(target_dir, name)
    size = 0
    with open(path, "wb") as f:
        for chunk in iter(lambda: upload.file.read(1024 * 1024), b""):
            f.write(chunk)
            size += len(chunk)
    size_mb = size / (1024 * 1024)
    log.debug(f"Saved stream upload '{filename}' → '{name}' ({size_mb:.2f} MB) in '{target_dir}'")
    return name, size_mb


def get_image_dimensions(content: bytes) -> tuple[int, int]:
    img = Image.open(BytesIO(content))
    return img.size


def simulate_chunk_and_classify(content: bytes) -> tuple[list[ChunkResult], float]:
    """Simulate: divide image into chunks and classify each (3 classes)."""
    w, h = get_image_dimensions(content)
    log.debug(f"[simulate] Image size: {w}×{h} px — chunk size: {CHUNK_SIZE}px")
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
    log.debug(f"[simulate] Produced {len(chunks)} chunks")
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
        log.warning(f"[classifier] Crops directory not found: {crops_dir}")
        return mapping

    pat = re.compile(r"plant_(\d+)_([A-Za-z]+)_([0-9]+\.[0-9]+)\.jpg$", re.IGNORECASE)
    matched = 0
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
            matched += 1

    log.debug(f"[classifier] Parsed {matched} crop classification results from '{crops_dir}'")
    return mapping


def _chunks_from_detected_csv_and_crops(detected_csv: Path, crops_dir: Path) -> list[ChunkResult]:
    """
    Returns ChunkResult list compatible with the current dashboard.
    """
    log.debug(f"[parser] Reading detections from '{detected_csv.name}'")
    idx_to_pred = _parse_classification_outputs(crops_dir)

    # Parse CSV and build chunk results
    chunks: list[ChunkResult] = []
    with open(detected_csv, "r", newline="") as f:
        # ID,x_min,y_min,x_max,y_max
        lines = f.read().splitlines()
    # skip header
    rows = lines[1:] if len(lines) > 1 else []
    log.debug(f"[parser] {len(rows)} detection rows in CSV")

    skipped = 0
    for row_idx, line in enumerate(rows):
        parts = [p.strip() for p in line.split(",")]
        if len(parts) < 5:
            skipped += 1
            continue
        try:
            chunk_id = int(parts[0])
            x1, y1, x2, y2 = map(int, parts[1:5])
        except Exception:
            skipped += 1
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

    if skipped:
        log.warning(f"[parser] Skipped {skipped} malformed CSV rows")
    log.debug(f"[parser] Built {len(chunks)} ChunkResult(s)")
    return chunks


def _load_module_from_path(module_name: str, path: str):
    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load module {module_name} from {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _run_local_model(saved_path: str, save_dir: str | None = None) -> tuple[list[ChunkResult], float]:
    """
    Run website_integration's YOLO + EfficientNet directly on the saved image path.
    Uses CUDA if available (DEVICE is set at module load time).
    """
    if not settings.website_integration_dir:
        raise RuntimeError("WEBSITE_INTEGRATION_DIR is not set in backend .env")

    log.info(f"[model] Starting inference on '{Path(saved_path).name}' (device={DEVICE})")

    # Set torch default device to CUDA when available so model.to(device) works
    try:
        import torch
        if DEVICE == "cuda":
            torch.set_default_device("cuda")
            log.debug("[model] torch default device set to 'cuda'")
    except Exception as exc:
        log.warning(f"[model] Could not set default torch device: {exc}")

    wi_dir = Path(settings.website_integration_dir)
    scripts_dir = wi_dir / "scripts"
    yolo_path = scripts_dir / "yolo_wrapper.py"
    cls_path  = scripts_dir / "classify_wrapper.py"

    log.debug(f"[model] website_integration dir: {wi_dir}")
    log.debug(f"[model] YOLO script   : {yolo_path}")
    log.debug(f"[model] Classify script: {cls_path}")

    if not yolo_path.exists() or not cls_path.exists():
        raise RuntimeError(f"website_integration scripts not found under {scripts_dir}")

    log.info("[model] Loading YOLO (SAHI) wrapper …")
    yolo_mod = _load_module_from_path("wi_yolo_wrapper", str(yolo_path))
    log.info("[model] Loading EfficientNet-B4 classifier wrapper …")
    cls_mod  = _load_module_from_path("wi_classify_wrapper", str(cls_path))

    # ── Output directory: one folder per image run ───────────────────────────
    # Named after the image stem + timestamp so nothing is ever overwritten.
    img_stem = Path(saved_path).stem
    base_out_dir = Path(save_dir) if save_dir else Path(settings.upload_dir)
    run_dir = base_out_dir / img_stem
    run_dir.mkdir(parents=True, exist_ok=True)
    log.info(f"[model] Output folder: {run_dir}")

    out_csv           = run_dir / "detected.csv"
    out_visual        = run_dir / "visual.jpg"
    classified_visual = run_dir / "classified.jpg"
    crops_dir         = run_dir / "crops"   # classifier creates Healthy/ Partial/ Rejected/ inside here

    t0 = time.perf_counter()

    # ── Stage 1: SAHI + YOLOv11 sliced detection ─────────────────────────────
    log.info(f"[model] Stage 1/2 — SAHI+YOLOv11 sliced detection (device={DEVICE}) …")
    t_yolo = time.perf_counter()
    yolo_mod.run_yolo(str(saved_path), str(out_csv), str(out_visual))
    yolo_elapsed = round(time.perf_counter() - t_yolo, 2)
    log.info(f"[model] SAHI detection complete in {yolo_elapsed}s — CSV: '{out_csv}'")

    # ── Stage 2: EfficientNet-B4 classification ──────────────────────────────
    # Device is resolved inside classify_wrapper.py via torch.cuda.is_available().
    log.info(f"[model] Stage 2/2 — EfficientNet-B4 classification …")
    t_cls = time.perf_counter()
    cls_mod.run_classification(
        str(saved_path), str(out_csv), str(crops_dir), str(classified_visual)
    )
    cls_elapsed = round(time.perf_counter() - t_cls, 2)
    log.info(
        f"[model] Classification complete in {cls_elapsed}s — "
        f"crops saved to '{crops_dir}/' (Healthy/ Partial/ Rejected/)"
    )

    elapsed = round(time.perf_counter() - t0, 2)
    log.info(f"[model] ✅ Full pipeline done in {elapsed}s (YOLO: {yolo_elapsed}s + Classify: {cls_elapsed}s)")

    chunks = _chunks_from_detected_csv_and_crops(out_csv, crops_dir)
    log.info(f"[model] Returning {len(chunks)} chunk results from '{run_dir.name}/'")
    return chunks, elapsed



async def run_model(content: bytes, saved_path: str, save_dir: str | None = None) -> tuple[list[ChunkResult], float]:
    """
    Main entrypoint used by the upload endpoint.

    - If WEBSITE_INTEGRATION_DIR is set, run the local model code directly using the saved image path.
    - Otherwise, fall back to simulation.
    """
    if settings.website_integration_dir:
        log.info(f"run_model: using local model pipeline for '{Path(saved_path).name}'")
        return _run_local_model(saved_path, save_dir)
    # Fallback demo mode
    log.info(f"run_model: WEBSITE_INTEGRATION_DIR not set — using simulation for '{Path(saved_path).name}'")
    if not content:
        with open(saved_path, "rb") as f:
            content = f.read()
    chunks = simulate_chunk_and_classify(content)
    return chunks, 0.0


def compute_summary(chunks: list[ChunkResult]) -> dict:
    total   = len(chunks)
    healthy = sum(1 for c in chunks if c.predicted_class == "healthy")
    mild    = sum(1 for c in chunks if c.predicted_class == "mild_infection")
    severe  = sum(1 for c in chunks if c.predicted_class == "severe_infection")
    health_score = round(100.0 * healthy / total, 1) if total else 0
    dominant = max(
        [("healthy", healthy), ("mild_infection", mild), ("severe_infection", severe)],
        key=lambda x: x[1],
    )[0]
    summary = {
        "chunks_total": total,
        "chunks_healthy": healthy,
        "chunks_mild": mild,
        "chunks_severe": severe,
        "overall_health_score": health_score,
        "dominant_class": dominant,
    }
    log.debug(
        f"Summary: {total} chunks | healthy={healthy} mild={mild} severe={severe} "
        f"| health_score={health_score}% | dominant={dominant}"
    )
    return summary
