from fastapi import APIRouter, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse
from app.database import get_db
from app.services.image_service import save_upload_stream, run_model, compute_summary, ensure_upload_dir
from app.models.analysis import AnalysisResult, ChunkResult, AnalysisListItem
from app.config import get_settings
from datetime import datetime
from bson import ObjectId
import os
import json

router = APIRouter(prefix="/analysis", tags=["analysis"])
_settings = get_settings()

# In-memory fallback when MongoDB is unavailable
_MEM_ANALYSES: dict[str, dict] = {}


@router.get("/history/list", response_model=list)
async def list_history(skip: int = 0, limit: int = 50):
    db = get_db()
    if db is None:
        docs = list(_MEM_ANALYSES.values())
        docs.sort(key=lambda d: d.get("created_at") or datetime.min, reverse=True)
        docs = docs[skip : skip + limit]
        return [
            {
                "id": str(d["_id"]),
                "original_filename": d["original_filename"],
                "overall_health_score": d["overall_health_score"],
                "dominant_class": d["dominant_class"],
                "created_at": d["created_at"].isoformat() if isinstance(d.get("created_at"), datetime) else str(d.get("created_at")),
            }
            for d in docs
        ]
    cursor = db.analyses.find({}).sort("created_at", -1).skip(skip).limit(limit)
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
async def upload_and_analyze(file: UploadFile = File(...)):
    db = get_db()
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    stored_name, size_mb = save_upload_stream(file, file.filename or "image")
    stored_path = os.path.abspath(os.path.join(_settings.upload_dir, stored_name))
    try:
        # run_model only needs the saved path for the real model;
        # we pass empty content to avoid loading huge files into memory.
        chunks, elapsed = await run_model(b"", stored_path)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Model inference failed. Make sure the model server is running at MODEL_API_URL. Error: {e}",
        )
    summary = compute_summary(chunks)
    analysis_id = str(ObjectId())
    now = datetime.utcnow()
    doc = {
        "_id": analysis_id,
        "user_id": "anonymous",
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
        "stored_path": stored_path,
    }
    if db is not None:
        await db.analyses.insert_one(doc)
    else:
        _MEM_ANALYSES[analysis_id] = doc
    return {
        "analysis_id": analysis_id,
        "original_filename": doc["original_filename"],
        "image_size_mb": doc["image_size_mb"],
        **summary,
        "processing_time_seconds": elapsed,
        "created_at": now.isoformat(),
        "stored_path": stored_path,
    }


@router.get("/{analysis_id}")
async def get_analysis(analysis_id: str):
    db = get_db()
    if db is None:
        doc = _MEM_ANALYSES.get(analysis_id)
    else:
        doc = await db.analyses.find_one({"_id": analysis_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Analysis not found")
    doc["id"] = str(doc["_id"])
    doc["created_at"] = doc["created_at"].isoformat()
    for c in doc.get("chunk_results", []):
        if "severity_score" in c and c["severity_score"] is None:
            pass
    return doc


@router.get("/{analysis_id}/download/report")
async def download_report(analysis_id: str):
    db = get_db()
    if db is None:
        doc = _MEM_ANALYSES.get(analysis_id)
    else:
        doc = await db.analyses.find_one({"_id": analysis_id})
    if not doc:
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
