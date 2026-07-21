#!/bin/sh
set -e

VENV_BIN="/nuros/backend/.venv/bin"

# Cloud Run Job: parse registrar PDFs and upload JSON to GCS (no API server).
if [ "$SCHEDULE_SYNC_JOB" = "1" ]; then
    exec "$VENV_BIN/python" -m backend.modules.courses.registrar.schedule_sync_job
fi

if [ "$IS_DEBUG" = "false" ]; then
    exec "$VENV_BIN/gunicorn" -w $(( $(nproc) * 2 + 1 )) -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 backend.main:app
else
    exec "$VENV_BIN/uvicorn" backend.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir /nuros/backend
fi
