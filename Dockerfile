# Use official Python 3.12 slim image
FROM python:3.12-slim-bookworm

# Set build arguments
ARG IS_DEBUG=true

# Set timezone and Python settings
ENV TZ=UTC \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/nuros \
    POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=1 \
    POETRY_VIRTUALENVS_CREATE=0 \
    POETRY_CACHE_DIR=/tmp/poetry_cache

WORKDIR /nuros
ENV PATH="/root/.local/bin:${PATH}"

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
    libpq-dev \
    && pip install --no-cache-dir poetry \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml poetry.lock ./
RUN poetry install --no-root --no-cache

COPY . .

# Create a simple entrypoint shell script to conditionally run Uvicorn or Gunicorn
RUN echo '#!/bin/sh \n\
if [ "$IS_DEBUG" = "false" ]; then \n\
    gunicorn -w $(( $(nproc) * 2 + 1 )) -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 backend.main:app; \n\
else \n\
    uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload; \n\
fi' > /start.sh \
    && chmod +x /start.sh

# Run the script to decide the server behavior based on IS_DEBUG
CMD ["/start.sh"]
