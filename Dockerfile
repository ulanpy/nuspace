# Use official Python 3.12 slim image
FROM python:3.12-slim-bookworm

# Set timezone and Python settings
ENV TZ=UTC \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/nuros \
    POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=1 \
    POETRY_VIRTUALENVS_CREATE=0 \
    POETRY_CACHE_DIR=/tmp/poetry_cache

# Configure system dependencies and paths
WORKDIR /nuros
ENV PATH="/root/.local/bin:${PATH}"

# Install system dependencies and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
    libpq-dev \
    && pip install --no-cache-dir poetry \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files first for better layer caching
COPY pyproject.toml poetry.lock ./

# Install project dependencies
RUN poetry install --no-root --no-cache

# Copy application code
COPY . .

# Development server command
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
# CMD ["sh", "-c", "gunicorn -w ${WORKERS:-$(( $(nproc) * 2 + 1 ))} -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 backend.main:app"]
#на проде
