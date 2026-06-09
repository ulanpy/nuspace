#!/bin/sh
set -e

VENV_BIN="/nuros/backend/.venv/bin"

if [ "$IS_DEBUG" = "false" ]; then
    exec "$VENV_BIN/gunicorn" -w $(( $(nproc) * 2 + 1 )) -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 backend.main:app
else
    exec "$VENV_BIN/uvicorn" backend.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir /nuros/backend
fi
