# Use official Python 3.12 slim image
FROM python:3.12-alpine3.22

# Set build arguments
ARG IS_DEBUG=true

# Set timezone and Python settings
ENV TZ=UTC \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/nuros \
    POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=1 \
    POETRY_VIRTUALENVS_CREATE=0 \
    POETRY_CACHE_DIR=/tmp/poetry_cache

WORKDIR /nuros
ENV PATH="/root/.local/bin:${PATH}"

RUN apk -u add build-base python3-dev libpq-dev \
    && pip install --no-cache-dir poetry 


COPY backend/pyproject.toml backend/poetry.lock ./
RUN poetry install --no-root --no-cache

COPY .. .

COPY backend/start.sh /
RUN sed -i 's/\r$//' /start.sh
RUN chmod +x /start.sh
RUN apk add --no-cache bash
# Run the script to decide the server behavior based on IS_DEBUG
CMD ["/start.sh"]
