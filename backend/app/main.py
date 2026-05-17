import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import engine
from app.models.orm import Base
from app.routers import analysis_router, auth_router, batch_router
from app.logger import get_logger

log = get_logger(__name__)


def _print_startup_banner():
    """Print a nicely formatted startup banner to the terminal."""
    try:
        import torch
        cuda_ok  = torch.cuda.is_available()
        cuda_ver = torch.version.cuda or "N/A"
        gpu_name = torch.cuda.get_device_name(0) if cuda_ok else "None"
        torch_ver = torch.__version__
    except ImportError:
        cuda_ok, cuda_ver, gpu_name, torch_ver = False, "N/A", "None", "not installed"

    lines = [
        "",
        "  ╔══════════════════════════════════════════════════╗",
        "  ║         🌿  MAHYCO BACKEND  — Starting up        ║",
        "  ╚══════════════════════════════════════════════════╝",
        f"     PyTorch   : {torch_ver}",
        f"     CUDA      : {'✅  ' + cuda_ver if cuda_ok else '❌  Not available (CPU mode)'}",
        f"     GPU        : {gpu_name}",
        "     Docs       : http://127.0.0.1:8000/docs",
        "     API prefix : /api",
        "",
    ]
    for line in lines:
        print(line)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _print_startup_banner()

    log.info("Connecting to PostgreSQL and creating tables if needed …")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    log.info("PostgreSQL ✅  — tables ready")

    log.info("Routers loaded: auth · analysis · batch")
    log.info("Mahyco API is ready to accept requests")

    yield

    log.info("Shutting down — disposing DB engine …")
    await engine.dispose()
    log.info("Shutdown complete. Goodbye 👋")


app = FastAPI(
    title="Mahyco API",
    description="Drone agriculture land image analysis — upload, chunk, segment, classify disease (3 classes)",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Scale-X", "X-Scale-Y", "X-Original-Width", "X-Original-Height"],
)

app.include_router(auth_router.router, prefix="/api")
app.include_router(analysis_router.router, prefix="/api")
app.include_router(batch_router.router, prefix="/api")


@app.get("/")
def root():
    return {"app": "Mahyco", "version": "1.0.0", "docs": "/docs"}
