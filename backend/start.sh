#!/bin/sh
set -e

VENV_BIN="/nuros/backend/.venv/bin"

# Cloud Run Job: parse registrar PDFs and upload JSON to GCS (no API server).
if [ "$SCHEDULE_SYNC_JOB" = "1" ]; then
    exec "$VENV_BIN/python" -m backend.modules.courses.registrar.schedule_sync_job
fi

# Normalize IS_DEBUG so False/FALSE/0 from .env also count as prod.
IS_DEBUG_NORM=$(printf '%s' "${IS_DEBUG:-true}" | tr '[:upper:]' '[:lower:]')
# Keep hot reload independently switchable for local benchmarks.  Production
# keeps the existing behavior: IS_DEBUG=false disables reload by default.
RELOAD_NORM=$(printf '%s' "${UVICORN_RELOAD:-$IS_DEBUG_NORM}" | tr '[:upper:]' '[:lower:]')

# Single uvicorn process (one pod / one container). Scale horizontally via k8s replicas later.
# --no-access-log: replace uvicorn text access lines with structured JSON from middleware.
if [ "$RELOAD_NORM" = "false" ] || [ "$RELOAD_NORM" = "0" ] || [ "$RELOAD_NORM" = "no" ]; then
    exec "$VENV_BIN/uvicorn" backend.main:app --host 0.0.0.0 --port 8000 --no-access-log
else
    exec "$VENV_BIN/uvicorn" backend.main:app \
        --host 0.0.0.0 \
        --port 8000 \
        --no-access-log \
        --reload \
        --reload-dir /nuros/backend \
        --reload-exclude '.venv/*' \
        --reload-exclude '**/.venv/*' \
        --reload-exclude '**/__pycache__/*' \
        --reload-exclude '**/*.pyc' \
        --reload-exclude '**/.mypy_cache/*' \
        --reload-exclude '**/.pytest_cache/*' \
        --reload-exclude '**/.ruff_cache/*' \
        --reload-exclude '**/.git/*'
fi
