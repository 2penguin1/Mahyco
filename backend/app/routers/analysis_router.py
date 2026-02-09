from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse
from app.auth import get_current_user_optional
from app.database import get_db
from app.services.image_service import (
    save_upload,
    simulate_chunk_and_classify,
    compute_summary,
    ensure_upload_dir,
)
from app.models.analysis import AnalysisResult, ChunkResult, AnalysisListItem
from app.config import get_settings
from datetime import datetime
from bson import ObjectId
import os
import json

router = APIRouter(prefix="/analysis", tags=["analysis"])
_settings = get_settings()


@router.get("/history/list", response_model=list)
async def list_history(
    current_user: dict = Depends(get_current_user_optional),
    skip: int = 0,
    limit: int = 50,
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    cursor = (
        db.analyses.find({"user_id": current_user["id"]})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    items = []
    async for doc in cursor:
        items.append(
            {
                "id": str(doc["_id"]),
                "original_filename": doc["original_filename"],
                "overall_health_score": doc["overall_health_score"],
                "dominant_class": doc["dominant_class"],
                "created_at": doc["created_at"].isoformat(),
            }
        )
    return items


@router.post("/upload")
async def upload_and_analyze(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user_optional),
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:  # 50MB
        raise HTTPException(status_code=400, detail="Image too large (max 50MB)")
    stored_name, size_mb = save_upload(content, file.filename or "image.png")
    chunks, elapsed = simulate_chunk_and_classify(content)
    summary = compute_summary(chunks)
    analysis_id = str(ObjectId())
    now = datetime.utcnow()
    doc = {
        "_id": analysis_id,
        "user_id": current_user["id"],
        "original_filename": file.filename or "image.png",
        "stored_filename": stored_name,
        "image_size_mb": round(size_mb, 2),
        "chunks_total": summary["chunks_total"],
        "chunks_healthy": summary["chunks_healthy"],
        "chunks_mild": summary["chunks_mild"],
        "chunks_severe": summary["chunks_severe"],
        "overall_health_score": summary["overall_health_score"],
        "dominant_class": summary["dominant_class"],
        "chunk_results": [c.model_dump() for c in chunks],
        "processing_time_seconds": elapsed,
        "created_at": now,
    }
    await db.analyses.insert_one(doc)
    return {
        "analysis_id": analysis_id,
        "original_filename": doc["original_filename"],
        "image_size_mb": doc["image_size_mb"],
        **summary,
        "processing_time_seconds": elapsed,
        "created_at": now.isoformat(),
    }


@router.get("/{analysis_id}")
async def get_analysis(
    analysis_id: str,
    current_user: dict = Depends(get_current_user_optional),
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    doc = await db.analyses.find_one({"_id": analysis_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Analysis not found")
    if doc["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not your analysis")
    doc["id"] = str(doc["_id"])
    doc["created_at"] = doc["created_at"].isoformat()
    for c in doc.get("chunk_results", []):
        if "severity_score" in c and c["severity_score"] is None:
            pass
    return doc


@router.get("/{analysis_id}/download/report")
async def download_report(
    analysis_id: str,
    current_user: dict = Depends(get_current_user_optional),
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    doc = await db.analyses.find_one({"_id": analysis_id})
    if not doc or doc["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Analysis not found")
    report = {
        "analysis_id": analysis_id,
        "original_filename": doc["original_filename"],
        "created_at": doc["created_at"].isoformat(),
        "image_size_mb": doc["image_size_mb"],
        "chunks_total": doc["chunks_total"],
        "chunks_healthy": doc["chunks_healthy"],
        "chunks_mild": doc["chunks_mild"],
        "chunks_severe": doc["chunks_severe"],
        "overall_health_score": doc["overall_health_score"],
        "dominant_class": doc["dominant_class"],
        "processing_time_seconds": doc["processing_time_seconds"],
        "chunk_results": doc.get("chunk_results", []),
    }
    ensure_upload_dir()
    path = os.path.join(_settings.upload_dir, f"report_{analysis_id}.json")
    path = os.path.abspath(path)
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w") as f:
        json.dump(report, f, indent=2)
    return FileResponse(
        path,
        filename=f"mahyco_report_{analysis_id}.json",
        media_type="application/json",
    )
