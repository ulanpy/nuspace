#!/bin/sh
if [ "$IS_DEBUG" = "false" ]; then
    gunicorn -w $(( $(nproc) * 2 + 1 )) -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 backend.main:app;
else
    uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload;
fi
