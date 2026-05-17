"""
Celery application for Mahyco background tasks.

Start the worker (from backend/ directory):
    celery -A app.celery_app worker --loglevel=info --pool=solo

--pool=solo is required on Windows.
"""
from celery import Celery
from celery.signals import worker_ready, worker_shutdown
from app.config import get_settings
from app.logger import get_logger

_settings = get_settings()
log = get_logger(__name__)

celery_app = Celery(
    "mahyco",
    broker=_settings.redis_url,
    backend=_settings.redis_url,
    include=["app.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)


@worker_ready.connect
def on_worker_ready(**kwargs):
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
        "  ║       ⚙️   MAHYCO CELERY WORKER — Ready          ║",
        "  ╚══════════════════════════════════════════════════╝",
        f"     PyTorch   : {torch_ver}",
        f"     CUDA      : {'✅  ' + cuda_ver if cuda_ok else '❌  Not available (CPU mode)'}",
        f"     GPU        : {gpu_name}",
        f"     Broker    : {_settings.redis_url}",
        "     Tasks      : app.tasks.process_batch_job",
        "",
    ]
    for line in lines:
        print(line)

    if cuda_ok:
        log.info(f"GPU acceleration enabled — {gpu_name} (CUDA {cuda_ver})")
    else:
        log.warning("CUDA not available — worker will run inference on CPU")


@worker_shutdown.connect
def on_worker_shutdown(**kwargs):
    log.info("Celery worker shutting down. Goodbye 👋")
