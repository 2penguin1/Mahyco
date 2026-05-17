"""
Debugger-style logger for the Mahyco backend.

Controlled by the DEBUG_LOGGING flag in backend/.env:

    DEBUG_LOGGING=true   →  Full colour terminal output for every process
    DEBUG_LOGGING=false  →  Complete silence (NullHandler — nothing printed)

Usage in any module:
    from app.logger import get_logger
    log = get_logger(__name__)
    log.info("Model loaded")
    log.debug("Tensor shape: ...")
    log.warning("CUDA not found")
    log.error("Inference failed", exc_info=True)
"""
import logging
import os
import sys

# ── Read the DEBUG flag ────────────────────────────────────────────────────────
# uvicorn does NOT export .env variables to os.environ automatically, so we
# load the .env file ourselves with python-dotenv before reading the flag.
try:
    from pathlib import Path
    from dotenv import load_dotenv as _load_dotenv
    _env_path = Path(__file__).resolve().parent.parent / ".env"  # backend/.env
    _load_dotenv(_env_path, override=False)
except ImportError:
    pass  # dotenv not installed — fall back to os.environ as-is

_raw = os.environ.get("DEBUG_LOGGING", "false").strip().lower()
DEBUG_LOGGING: bool = _raw in ("true", "1", "yes")

# ── ANSI colour codes ──────────────────────────────────────────────────────────
_RESET   = "\033[0m"
_BOLD    = "\033[1m"
_GREY    = "\033[90m"
_CYAN    = "\033[96m"
_GREEN   = "\033[92m"
_YELLOW  = "\033[93m"
_RED     = "\033[91m"
_MAGENTA = "\033[95m"
_WHITE   = "\033[97m"

_LEVEL_COLOURS = {
    "DEBUG":    _GREY,
    "INFO":     _GREEN,
    "WARNING":  _YELLOW,
    "ERROR":    _RED,
    "CRITICAL": _MAGENTA,
}

_TAG_COLOURS = {
    "image_service":   _CYAN,
    "tasks":           _MAGENTA,
    "analysis_router": _GREEN,
    "batch_router":    _YELLOW,
    "main":            _WHITE,
    "celery_app":      _MAGENTA,
}


class _ColourFormatter(logging.Formatter):
    """Colour-coded, timestamped formatter for the debugger output."""

    def format(self, record: logging.LogRecord) -> str:
        level_col = _LEVEL_COLOURS.get(record.levelname, "")
        tag       = record.name.split(".")[-1]          # e.g. 'image_service'
        tag_col   = _TAG_COLOURS.get(tag, _CYAN)

        line = (
            f"{level_col}{_BOLD}[{record.levelname:<8}]{_RESET} "
            f"{_GREY}{self.formatTime(record, '%H:%M:%S')}{_RESET}  "
            f"{tag_col}[{tag:<22}]{_RESET}  "
            f"{record.getMessage()}"
        )

        if record.exc_info:
            line += "\n" + self.formatException(record.exc_info)
        return line


# ── Build the root 'mahyco' logger once ───────────────────────────────────────
_root = logging.getLogger("mahyco")

if not _root.handlers:
    if DEBUG_LOGGING:
        # Verbose mode: colour output to stdout
        _handler = logging.StreamHandler(sys.stdout)
        _handler.setFormatter(_ColourFormatter())
        _root.setLevel(logging.DEBUG)
        _root.addHandler(_handler)

        # Print a clear banner so you know debug mode is ON
        print(
            "\n"
            "  ┌─────────────────────────────────────────────────┐\n"
            "  │  🐛  MAHYCO DEBUG LOGGING  —  ENABLED           │\n"
            "  │     Set DEBUG_LOGGING=false in .env to silence  │\n"
            "  └─────────────────────────────────────────────────┘\n"
        )
    else:
        # Silent mode: swallow everything
        _root.addHandler(logging.NullHandler())
        _root.setLevel(logging.CRITICAL + 1)   # nothing gets through

    _root.propagate = False


def get_logger(name: str) -> logging.Logger:
    """
    Return a child logger under the 'mahyco' namespace.

    Args:
        name: Typically __name__ of the calling module.
              'app.routers.batch_router' → tag shown as '[batch_router]'

    Returns:
        logging.Logger — active when DEBUG_LOGGING=true, silent when false.
    """
    short = name.removeprefix("app.").replace(".", "_")
    return _root.getChild(short)
