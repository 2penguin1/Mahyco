"""
Celery tasks for Mahyco batch image processing.

Uses a synchronous SQLAlchemy session (psycopg2) because Celery workers are sync.
The sync URL is derived by replacing the asyncpg driver with psycopg2.
"""
from __future__ import annotations

import uuid
import time
import random
import os
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.celery_app import celery_app
from app.config import get_settings
from app.models.analysis import ChunkResult, DiseaseClass
from app.models.orm import BatchJob
from app.logger import get_logger

log = get_logger(__name__)
_settings = get_settings()

# ── Device selection (Celery worker) ─────────────────────────────────────────
try:
    import torch as _torch
    DEVICE = "cuda" if _torch.cuda.is_available() else "cpu"
    if DEVICE == "cuda":
        log.info(
            f"Compute device: CUDA ✅ — {_torch.cuda.get_device_name(0)} "
            f"| VRAM {_torch.cuda.get_device_properties(0).total_memory // 1024**2} MB"
        )
    else:
        log.warning("Compute device: CPU ⚠️  — CUDA not available, inference will be slow")
except ImportError:
    DEVICE = "cpu"
    log.error("torch not installed — falling back to CPU simulation mode")


# Build a synchronous DB URL from the async one
_sync_url = _settings.database_url.replace(
    "postgresql+asyncpg://", "postgresql+psycopg2://"
).replace("postgresql+asyncpg:", "postgresql+psycopg2:")

_engine = create_engine(_sync_url, pool_pre_ping=True)
_SessionLocal = sessionmaker(bind=_engine)


def _get_session() -> Session:
    return _SessionLocal()


# ── Helpers ────────────────────────────────────────────────────────────────

CLASSES: list[DiseaseClass] = ["healthy", "mild_infection", "severe_infection"]
CHUNK_SIZE = 256


def _simulate_single(image_path: str) -> tuple[list[ChunkResult], float]:
    """Fallback: simulate chunking + classification for one image."""
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None  # Allow massive drone images

    log.debug(f"[simulate] Opening image: {Path(image_path).name}")
    try:
        img = Image.open(image_path)
        w, h = img.size
        log.debug(f"[simulate] Image dimensions: {w}×{h} px")
    except Exception as exc:
        log.warning(f"[simulate] Could not open image ({exc}), using default 512×512")
        w, h = 512, 512

    chunks: list[ChunkResult] = []
    idx = 0
    for y0 in range(0, h, CHUNK_SIZE):
        for x0 in range(0, w, CHUNK_SIZE):
            cw = min(CHUNK_SIZE, w - x0)
            ch = min(CHUNK_SIZE, h - y0)
            if cw <= 0 or ch <= 0:
                continue
            pred = random.choice(CLASSES)
            conf = round(random.uniform(0.7, 0.99), 2)
            sev = round(random.uniform(0.0, 1.0), 2) if pred != "healthy" else None
            chunks.append(ChunkResult(
                chunk_id=idx, x=x0, y=y0, width=cw, height=ch,
                predicted_class=pred, confidence=conf, severity_score=sev,
            ))
            idx += 1
            if idx >= 64:
                break
        if idx >= 64:
            break

    elapsed = round(random.uniform(0.5, 2.0), 2)
    log.debug(f"[simulate] Generated {len(chunks)} chunks in {elapsed}s")
    return chunks, elapsed


def _compute_summary(chunks: list[ChunkResult]) -> dict:
    total = len(chunks)
    healthy = sum(1 for c in chunks if c.predicted_class == "healthy")
    mild    = sum(1 for c in chunks if c.predicted_class == "mild_infection")
    severe  = sum(1 for c in chunks if c.predicted_class == "severe_infection")
    health_score = round(100.0 * healthy / total, 1) if total else 0.0
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


def _process_single_image(image_path: str, save_dir: str | None, index: int, total: int) -> dict:
    """Process one image and return a result dict."""
    from app.services.image_service import _run_local_model

    filename = Path(image_path).name
    log.info(f"  [{index}/{total}] Processing '{filename}' …")
    t0 = time.perf_counter()

    try:
        if _settings.website_integration_dir:
            log.debug(f"  [{index}/{total}] Running local model (YOLO + EfficientNet) on '{filename}'")
            chunks, elapsed = _run_local_model(image_path, save_dir)
        else:
            log.debug(f"  [{index}/{total}] No model dir set — using simulation for '{filename}'")
            chunks, elapsed = _simulate_single(image_path)

        summary = _compute_summary(chunks)
        wall = round(time.perf_counter() - t0, 2)

        log.info(
            f"  [{index}/{total}] ✅ '{filename}' done in {wall}s — "
            f"health={summary['overall_health_score']}% | dominant={summary['dominant_class']} | "
            f"chunks={summary['chunks_total']}"
        )
        return {
            "filename": filename,
            "stored_path": image_path,
            "status": "completed",
            "processing_time_seconds": elapsed,
            "chunk_results": [c.model_dump() for c in chunks],
            **summary,
        }
    except Exception as exc:
        wall = round(time.perf_counter() - t0, 2)
        log.error(f"  [{index}/{total}] ❌ '{filename}' FAILED after {wall}s — {exc}", exc_info=True)
        return {
            "filename": filename,
            "stored_path": image_path,
            "status": "failed",
            "error": str(exc),
            "overall_health_score": 0.0,
            "dominant_class": "healthy",
            "chunks_total": 0,
        }


# ── Celery Task ────────────────────────────────────────────────────────────

@celery_app.task(bind=True, name="app.tasks.process_batch_job")
def process_batch_job(self, job_id_str: str, image_paths: list[str], save_dir: str | None = None):
    """
    Process a list of images for a batch job.

    Updates BatchJob.status, processed_images, failed_images, results
    as each image completes.
    """
    job_id = uuid.UUID(job_id_str)
    total  = len(image_paths)
    session = _get_session()

    log.info(f"═══ Batch Job {job_id_str[:8]} started — {total} image(s) to process ═══")

    try:
        # Mark as PROCESSING
        job: BatchJob = session.get(BatchJob, job_id)
        if not job:
            log.error(f"Batch job {job_id_str[:8]} not found in DB — aborting")
            return
        job.status = "PROCESSING"
        session.commit()
        log.info(f"Job {job_id_str[:8]} → status: PROCESSING")

        results: list[dict] = []

        for i, path in enumerate(image_paths, start=1):
            result = _process_single_image(path, save_dir, i, total)
            results.append(result)

            # Refresh from DB to get latest state
            session.expire(job)
            job = session.get(BatchJob, job_id)
            if not job:
                log.error(f"Job {job_id_str[:8]} disappeared from DB during processing — aborting")
                return

            job.processed_images = i
            if result["status"] == "failed":
                job.failed_images = (job.failed_images or 0) + 1
            job.results = list(results)  # reassign to trigger JSON update
            session.commit()

            failed_so_far = job.failed_images or 0
            log.info(
                f"Job {job_id_str[:8]} progress: {i}/{total} done "
                f"| failed so far: {failed_so_far}"
            )

        # Final update
        job = session.get(BatchJob, job_id)
        if job:
            job.status = "COMPLETED"
            job.completed_at = datetime.now(tz=timezone.utc)
            session.commit()

            failed = job.failed_images or 0
            passed = total - failed
            log.info(
                f"═══ Batch Job {job_id_str[:8]} COMPLETED ✅ — "
                f"{passed}/{total} succeeded, {failed} failed ═══"
            )

    except Exception as exc:
        log.error(f"═══ Batch Job {job_id_str[:8]} FAILED ❌ — {exc} ═══", exc_info=True)
        try:
            job = session.get(BatchJob, job_id)
            if job:
                job.status = "FAILED"
                job.error_message = str(exc)
                job.completed_at = datetime.now(tz=timezone.utc)
                session.commit()
        except Exception as inner:
            log.error(f"Could not update job status to FAILED: {inner}")
        raise
    finally:
        session.close()
        log.debug(f"DB session for job {job_id_str[:8]} closed")
