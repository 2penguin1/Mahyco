"""
Batch processing router for Mahyco.

Endpoints:
    POST   /api/batch/submit       — upload images, create BatchJob, dispatch Celery task
    GET    /api/batch/             — list all batch jobs (paginated)
    GET    /api/batch/{id}         — get job detail + results
    DELETE /api/batch/{id}         — delete job record
    GET    /api/batch/{id}/download — download JSON results as a zip
"""
from __future__ import annotations

import io
import json
import os
import uuid
import zipfile
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.orm import BatchJob
from app.services.image_service import save_upload_stream, ensure_upload_dir
from app.config import get_settings
from app.logger import get_logger

router = APIRouter(prefix="/batch", tags=["batch"])
_settings = get_settings()
log = get_logger(__name__)


def _job_to_dict(job: BatchJob) -> dict:
    return {
        "id": str(job.id),
        "status": job.status,
        "total_images": job.total_images,
        "processed_images": job.processed_images,
        "failed_images": job.failed_images,
        "save_dir": job.save_dir,
        "celery_task_id": job.celery_task_id,
        "error_message": job.error_message,
        "results": job.results or [],
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
    }


@router.post("/submit")
async def submit_batch(
    input_folder: str = Form(...),
    save_dir: str | None = Form(None),
    output_dir: str | None = Form(None),
    session: AsyncSession = Depends(get_session),
):
    """Scan input folder for images and dispatch a Celery batch job."""
    requested_output = output_dir if output_dir else save_dir
    log.info(
        f"POST /batch/submit — input_folder='{input_folder}' | "
        f"output_dir='{requested_output}'"
    )

    if not os.path.isdir(input_folder):
        log.warning(f"Batch submit rejected — '{input_folder}' is not a valid directory")
        raise HTTPException(status_code=400, detail="Input folder is not a valid directory")

    valid_extensions = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"}
    stored_paths = []
    
    for fname in os.listdir(input_folder):
        ext = os.path.splitext(fname)[1].lower()
        if ext in valid_extensions:
            stored_paths.append(os.path.join(input_folder, fname))
            
    if not stored_paths:
        log.warning("Batch submit rejected — no valid images found in folder")
        raise HTTPException(status_code=400, detail="No valid images found in the input folder")

    target_dir = requested_output if requested_output else _settings.upload_dir

    log.info(f"Found {len(stored_paths)} image(s) in '{input_folder}'")

    # Create BatchJob row
    job = BatchJob(
        status="PENDING",
        total_images=len(stored_paths),
        processed_images=0,
        failed_images=0,
        save_dir=target_dir,
        results=[],
    )
    session.add(job)
    await session.commit()
    await session.refresh(job)
    log.info(f"BatchJob created → id={job.id} | status=PENDING | images={len(stored_paths)}")

    # Dispatch Celery task
    from app.tasks import process_batch_job
    task = process_batch_job.delay(str(job.id), stored_paths, target_dir)

    # Save task ID
    job.celery_task_id = task.id
    await session.commit()
    log.info(f"Celery task dispatched → task_id={task.id} for job={job.id}")

    payload = _job_to_dict(job)
    payload["input_folder_name"] = os.path.basename(input_folder.strip("\\/"))
    return payload


@router.get("/")
async def list_batch_jobs(
    skip: int = 0,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
):
    log.info(f"GET /batch/ — skip={skip} limit={limit}")
    count_result = await session.execute(select(func.count(BatchJob.id)))
    total = count_result.scalar_one()

    result = await session.execute(
        select(BatchJob).order_by(BatchJob.created_at.desc()).offset(skip).limit(limit)
    )
    jobs = result.scalars().all()
    log.info(f"Returning {len(jobs)} job(s) (total in DB: {total})")
    return {
        "total": total,
        "jobs": [_job_to_dict(j) for j in jobs],
    }


@router.get("/{job_id}")
async def get_batch_job(job_id: str, session: AsyncSession = Depends(get_session)):
    log.info(f"GET /batch/{job_id}")
    try:
        uid = uuid.UUID(job_id)
    except ValueError:
        log.warning(f"Invalid job ID: '{job_id}'")
        raise HTTPException(status_code=400, detail="Invalid job ID")

    result = await session.execute(select(BatchJob).where(BatchJob.id == uid))
    job = result.scalar_one_or_none()
    if not job:
        log.warning(f"Batch job {job_id} not found")
        raise HTTPException(status_code=404, detail="Batch job not found")

    log.debug(
        f"Job {job_id[:8]} — status={job.status} | "
        f"processed={job.processed_images}/{job.total_images} | failed={job.failed_images}"
    )
    return _job_to_dict(job)


@router.delete("/{job_id}")
async def delete_batch_job(job_id: str, session: AsyncSession = Depends(get_session)):
    log.info(f"DELETE /batch/{job_id}")
    try:
        uid = uuid.UUID(job_id)
    except ValueError:
        log.warning(f"Invalid job ID for delete: '{job_id}'")
        raise HTTPException(status_code=400, detail="Invalid job ID")

    result = await session.execute(select(BatchJob).where(BatchJob.id == uid))
    job = result.scalar_one_or_none()
    if not job:
        log.warning(f"Batch job {job_id} not found for deletion")
        raise HTTPException(status_code=404, detail="Batch job not found")

    await session.delete(job)
    await session.commit()
    log.info(f"Batch job {job_id[:8]} deleted successfully")
    return {"deleted": True, "id": job_id}


@router.get("/{job_id}/download")
async def download_batch_results(job_id: str, session: AsyncSession = Depends(get_session)):
    """Download all per-image JSON reports as a ZIP file."""
    log.info(f"GET /batch/{job_id}/download")
    try:
        uid = uuid.UUID(job_id)
    except ValueError:
        log.warning(f"Invalid job ID for download: '{job_id}'")
        raise HTTPException(status_code=400, detail="Invalid job ID")

    result = await session.execute(select(BatchJob).where(BatchJob.id == uid))
    job = result.scalar_one_or_none()
    if not job:
        log.warning(f"Batch job {job_id} not found for download")
        raise HTTPException(status_code=404, detail="Batch job not found")

    results = job.results or []
    log.info(f"Building ZIP for job {job_id[:8]} — {len(results)} result(s)")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # Summary
        summary = {
            "job_id": job_id,
            "status": job.status,
            "total_images": job.total_images,
            "processed_images": job.processed_images,
            "failed_images": job.failed_images,
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        }
        zf.writestr("summary.json", json.dumps(summary, indent=2))

        for i, r in enumerate(results):
            fname = r.get("filename", f"image_{i}")
            zf.writestr(f"results/{fname}.json", json.dumps(r, indent=2))

    buf.seek(0)
    zip_name = f"mahyco_batch_{job_id[:8]}.zip"
    log.info(f"Sending ZIP '{zip_name}' ({buf.getbuffer().nbytes // 1024} KB)")
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={zip_name}"},
    )
