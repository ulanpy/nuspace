# Use official Python 3.12 slim image
FROM python:3.12-alpine3.22

# Set build arguments
ARG IS_DEBUG=true

# Set timezone and Python settings
ENV TZ=UTC \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/nuros \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

RUN apk -u add \
    build-base \
    python3-dev \
    libpq-dev \
    gcc \
    g++ \
    musl-dev \
    linux-headers \
    bash

WORKDIR /nuros/backend

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

ENV PATH="/nuros/backend/.venv/bin:${PATH}"

COPY . ./

COPY start.sh /start.sh
RUN sed -i 's/\r$//' /start.sh && chmod +x /start.sh

WORKDIR /nuros

# Run the script to decide the server behavior based on IS_DEBUG
CMD ["/start.sh"]
