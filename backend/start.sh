#!/bin/sh
set -e

VENV_BIN="/nuros/backend/.venv/bin"

# Cloud Run Job: parse registrar PDFs and upload JSON to GCS (no API server).
if [ "$SCHEDULE_SYNC_JOB" = "1" ]; then
    exec "$VENV_BIN/python" -m backend.modules.courses.registrar.schedule_sync_job
fi

# Normalize IS_DEBUG so False/FALSE/0 from .env also count as prod.
IS_DEBUG_NORM=$(printf '%s' "${IS_DEBUG:-true}" | tr '[:upper:]' '[:lower:]')

# Single uvicorn process only (app is still stateful: bot webhook, Meili sync, etc.).
# Multi-worker gunicorn comes back after the app is made stateless.
if [ "$IS_DEBUG_NORM" = "false" ] || [ "$IS_DEBUG_NORM" = "0" ] || [ "$IS_DEBUG_NORM" = "no" ]; then
    exec "$VENV_BIN/uvicorn" backend.main:app --host 0.0.0.0 --port 8000
else
    exec "$VENV_BIN/uvicorn" backend.main:app \
        --host 0.0.0.0 \
        --port 8000 \
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
