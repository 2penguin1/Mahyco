from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_session
from app.models.orm import Analysis
from app.services.image_service import save_upload_stream, run_model, compute_summary, ensure_upload_dir
from app.config import get_settings
from app.logger import get_logger
from datetime import datetime
import os
import json
import uuid

router = APIRouter(prefix="/analysis", tags=["analysis"])
_settings = get_settings()
log = get_logger(__name__)


@router.get("/history/list", response_model=list)
async def list_history(
    skip: int = 0,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
):
    log.info(f"GET /analysis/history/list — skip={skip} limit={limit}")
    result = await session.execute(
        select(Analysis)
        .order_by(Analysis.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    rows = result.scalars().all()
    log.info(f"Returning {len(rows)} history record(s)")
    return [
        {
            "id": str(row.id),
            "original_filename": row.original_filename,
            "overall_health_score": row.overall_health_score,
            "dominant_class": row.dominant_class,
            "created_at": row.created_at.isoformat(),
        }
        for row in rows
    ]


@router.post("/upload")
async def upload_and_analyze(
    file: UploadFile = File(...),
    save_dir: str | None = Form(None),
    session: AsyncSession = Depends(get_session),
):
    log.info(f"POST /analysis/upload — file='{file.filename}' content_type='{file.content_type}'")

    if not file.content_type or not file.content_type.startswith("image/"):
        log.warning(f"Rejected upload '{file.filename}' — not an image ({file.content_type})")
        raise HTTPException(status_code=400, detail="File must be an image")

    stored_name, size_mb = save_upload_stream(file, file.filename or "image", save_dir if save_dir else None)
    actual_dir = save_dir if save_dir else _settings.upload_dir
    stored_path = os.path.abspath(os.path.join(actual_dir, stored_name))
    log.info(f"File saved: '{stored_name}' ({size_mb:.2f} MB) → '{actual_dir}'")

    log.info("Invoking model pipeline …")
    try:
        chunks, elapsed = await run_model(b"", stored_path, actual_dir)
    except Exception as e:
        log.error(f"Model inference failed for '{file.filename}': {e}", exc_info=True)
        raise HTTPException(
            status_code=502,
            detail=f"Model inference failed. Make sure the model server is running at MODEL_API_URL. Error: {e}",
        )

    summary = compute_summary(chunks)
    log.info(
        f"Inference complete in {elapsed}s — "
        f"health={summary['overall_health_score']}% | "
        f"dominant={summary['dominant_class']} | "
        f"chunks={summary['chunks_total']}"
    )

    analysis = Analysis(
        user_id=None,  # anonymous for now
        original_filename=file.filename or "image.png",
        stored_filename=stored_name,
        stored_path=stored_path,
        image_size_mb=round(size_mb, 2),
        chunks_total=summary["chunks_total"],
        chunks_healthy=summary["chunks_healthy"],
        chunks_mild=summary["chunks_mild"],
        chunks_severe=summary["chunks_severe"],
        overall_health_score=summary["overall_health_score"],
        dominant_class=summary["dominant_class"],
        processing_time_seconds=elapsed,
        chunk_results=[c.model_dump() for c in chunks],
    )
    session.add(analysis)
    await session.commit()
    await session.refresh(analysis)
    log.info(f"Analysis record saved → id={analysis.id}")

    return {
        "analysis_id": str(analysis.id),
        "original_filename": analysis.original_filename,
        "image_size_mb": analysis.image_size_mb,
        **summary,
        "processing_time_seconds": elapsed,
        "created_at": analysis.created_at.isoformat(),
        "stored_path": stored_path,
    }


@router.get("/{analysis_id}")
async def get_analysis(analysis_id: str, session: AsyncSession = Depends(get_session)):
    log.info(f"GET /analysis/{analysis_id}")
    try:
        uid = uuid.UUID(analysis_id)
    except ValueError:
        log.warning(f"Invalid analysis ID: '{analysis_id}'")
        raise HTTPException(status_code=400, detail="Invalid analysis ID")

    result = await session.execute(select(Analysis).where(Analysis.id == uid))
    row = result.scalar_one_or_none()
    if not row:
        log.warning(f"Analysis {analysis_id} not found")
        raise HTTPException(status_code=404, detail="Analysis not found")

    return {
        "analysis_id": str(row.id),
        "id": str(row.id),
        "original_filename": row.original_filename,
        "stored_path": row.stored_path,
        "image_size_mb": row.image_size_mb,
        "chunks_total": row.chunks_total,
        "chunks_healthy": row.chunks_healthy,
        "chunks_mild": row.chunks_mild,
        "chunks_severe": row.chunks_severe,
        "overall_health_score": row.overall_health_score,
        "dominant_class": row.dominant_class,
        "processing_time_seconds": row.processing_time_seconds,
        "chunk_results": row.chunk_results or [],
        "created_at": row.created_at.isoformat(),
    }


@router.get("/{analysis_id}/visual")
async def get_analysis_visual(analysis_id: str, session: AsyncSession = Depends(get_session)):
    log.info(f"GET /analysis/{analysis_id}/visual")
    try:
        uid = uuid.UUID(analysis_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid analysis ID")

    result = await session.execute(select(Analysis).where(Analysis.id == uid))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Analysis not found")

    from pathlib import Path
    
    img_stem = Path(row.stored_path).stem
    upload_dir = Path(_settings.upload_dir)
    
    # 1. Check new per-image folder
    visual_path = upload_dir / img_stem / "classified.jpg"
    
    if not visual_path.exists():
        # Fallback to visual.jpg in new folder
        visual_path = upload_dir / img_stem / "visual.jpg"
        
    if not visual_path.exists():
        # 2. Check old shared folder from before the fix
        if _settings.website_integration_dir:
            old_dir = Path(_settings.website_integration_dir) / "uploads"
            visual_path = old_dir / "classified.jpg"
            if not visual_path.exists():
                visual_path = old_dir / "visual.jpg"

    if not visual_path.exists():
        raise HTTPException(status_code=404, detail="Visual image not found")

    from PIL import Image as PILImage
    PILImage.MAX_IMAGE_PIXELS = None

    orig_w, orig_h = 1, 1
    if row.stored_path and Path(row.stored_path).exists():
        try:
            with PILImage.open(row.stored_path) as orig_img:
                orig_w, orig_h = orig_img.size
        except:
            pass

    thumb_w, thumb_h = 1, 1
    try:
        with PILImage.open(visual_path) as thumb_img:
            thumb_w, thumb_h = thumb_img.size
    except:
        pass

    scale_x = orig_w / thumb_w if thumb_w > 1 else 1.0
    scale_y = orig_h / thumb_h if thumb_h > 1 else 1.0

    headers = {
        "X-Scale-X": str(scale_x),
        "X-Scale-Y": str(scale_y),
    }

    return FileResponse(
        path=str(visual_path),
        media_type="image/jpeg",
        headers=headers
    )


@router.get("/{analysis_id}/orthomosaic")
async def get_orthomosaic(analysis_id: str, session: AsyncSession = Depends(get_session)):
    """
    Returns the original orthomosaic image (re-encoded as JPEG, max 4096px) for the Playground
    canvas. Response headers include X-Scale-X / X-Scale-Y so the frontend can align the
    chunk bounding-box coordinates (which are in original-pixel space) onto the thumbnail.
    """
    log.info(f"GET /analysis/{analysis_id}/orthomosaic")
    try:
        uid = uuid.UUID(analysis_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid analysis ID")

    result = await session.execute(select(Analysis).where(Analysis.id == uid))
    row = result.scalar_one_or_none()
    if not row or not row.stored_path:
        raise HTTPException(status_code=404, detail="Analysis not found")

    import io
    from pathlib import Path
    from PIL import Image as PILImage
    from starlette.responses import StreamingResponse

    PILImage.MAX_IMAGE_PIXELS = None  # allow huge drone images

    stored = row.stored_path
    if not Path(stored).exists():
        raise HTTPException(status_code=404, detail=f"Original image file not found at {stored}")

    log.info(f"Opening original orthomosaic: {stored}")
    try:
        img = PILImage.open(stored)
        # Ensure RGB (TIFFs may be RGBA, palette, or multi-band)
        if img.mode not in ("RGB",):
            img = img.convert("RGB")

        orig_w, orig_h = img.size
        log.info(f"Original size: {orig_w}x{orig_h}")

        # Resize to max 8192px on the longest side (no upscaling) to prevent pixelation
        MAX_DIM = 8192
        scale = min(MAX_DIM / orig_w, MAX_DIM / orig_h, 1.0)
        thumb_w = max(1, int(orig_w * scale))
        thumb_h = max(1, int(orig_h * scale))

        if scale < 1.0:
            log.info(f"Resizing to {thumb_w}x{thumb_h} (scale={scale:.4f})")
            img = img.resize((thumb_w, thumb_h), PILImage.LANCZOS)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=92, optimize=True)
        buf.seek(0)

        # Scale factors: how many original pixels per thumbnail pixel
        scale_x = orig_w / thumb_w
        scale_y = orig_h / thumb_h

        headers = {
            "X-Scale-X": str(scale_x),
            "X-Scale-Y": str(scale_y),
            "X-Original-Width": str(orig_w),
            "X-Original-Height": str(orig_h),
        }
        log.info(f"Serving orthomosaic thumbnail {thumb_w}x{thumb_h}, scaleX={scale_x:.4f}")
        return StreamingResponse(buf, media_type="image/jpeg", headers=headers)

    except Exception as e:
        log.error(f"Failed to process orthomosaic: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Could not process image: {e}")


@router.get("/{analysis_id}/download/report")
async def download_report(analysis_id: str, session: AsyncSession = Depends(get_session)):
    log.info(f"GET /analysis/{analysis_id}/download/report")
    try:
        uid = uuid.UUID(analysis_id)
    except ValueError:
        log.warning(f"Invalid analysis ID for report: '{analysis_id}'")
        raise HTTPException(status_code=400, detail="Invalid analysis ID")

    result = await session.execute(select(Analysis).where(Analysis.id == uid))
    row = result.scalar_one_or_none()
    if not row:
        log.warning(f"Analysis {analysis_id} not found for report download")
        raise HTTPException(status_code=404, detail="Analysis not found")

    report = {
        "analysis_id": str(row.id),
        "original_filename": row.original_filename,
        "created_at": row.created_at.isoformat(),
        "image_size_mb": row.image_size_mb,
        "chunks_total": row.chunks_total,
        "chunks_healthy": row.chunks_healthy,
        "chunks_mild": row.chunks_mild,
        "chunks_severe": row.chunks_severe,
        "overall_health_score": row.overall_health_score,
        "dominant_class": row.dominant_class,
        "processing_time_seconds": row.processing_time_seconds,
        "chunk_results": row.chunk_results or [],
    }

    ensure_upload_dir()
    path = os.path.abspath(os.path.join(_settings.upload_dir, f"report_{analysis_id}.json"))
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w") as f:
        json.dump(report, f, indent=2)

    log.info(f"Report written to '{path}' — sending download response")
    return FileResponse(
        path,
        filename=f"mahyco_report_{analysis_id}.json",
        media_type="application/json",
    )
