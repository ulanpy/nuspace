"""Structured JSON HTTP access logs for Loki (method/path match Prometheus labels)."""

from __future__ import annotations

import json
import logging
import sys
from typing import Any

_ACCESS_LOGGER_NAME = "nuspace.access"
# Keep Loki/Alloy lines bounded if a huge traceback is raised.
_MAX_TRACEBACK_CHARS = 16_384


def configure_access_logger() -> logging.Logger:
    """Emit pure JSON lines on stdout (no 'INFO:logger:' prefix). Idempotent."""
    # Drop uvicorn's text access lines (works even when image start.sh lacks --no-access-log).
    logging.getLogger("uvicorn.access").disabled = True

    logger = logging.getLogger(_ACCESS_LOGGER_NAME)
    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)
    logger.propagate = False
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
    return logger


def _level_for_status(status_code: str) -> str:
    if status_code.startswith("5"):
        return "error"
    if status_code.startswith("4"):
        return "warn"
    return "info"


def emit_access_log(
    *,
    method: str,
    path: str,
    status_code: str,
    duration_seconds: float,
    exception_type: str | None = None,
    traceback_text: str | None = None,
    user_sub: str | None = None,
    is_guest: bool | None = None,
    actor: str | None = None,
    raw_path: str | None = None,
) -> None:
    """Write one JSON access log line. Fields align with dashboard $method/$path filters.

    ``path`` is the low-cardinality route template (or ``[unmatched]``).
    ``raw_path`` is the actual request URL path (always set; for browsing unmatched 404s).
    """
    from backend.telemetry import current_trace_ids

    level = _level_for_status(status_code)
    payload: dict[str, Any] = {
        "method": method,
        "path": path,
        "raw_path": raw_path,
        "status_code": status_code,
        "duration_ms": round(duration_seconds * 1000, 3),
        "level": level,
        "log_type": "access",
        # Always present: real JWT sub, or null (never a sentinel like "guest").
        "user_sub": user_sub,
    }
    if is_guest is not None:
        payload["is_guest"] = is_guest
    if actor is not None:
        payload["actor"] = actor
    trace_id, span_id = current_trace_ids()
    if trace_id:
        payload["trace_id"] = trace_id
    if span_id:
        payload["span_id"] = span_id
    if exception_type:
        payload["exception_type"] = exception_type
    if traceback_text:
        if len(traceback_text) > _MAX_TRACEBACK_CHARS:
            traceback_text = traceback_text[:_MAX_TRACEBACK_CHARS] + "\n...[truncated]"
        payload["traceback"] = traceback_text
    configure_access_logger().info(json.dumps(payload, separators=(",", ":")))
