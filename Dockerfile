FROM python:latest
ENV TZ=UTC
WORKDIR /backend
RUN apt-get update && apt-get install -y \
    && rm -rf /var/lib/apt/lists/*

RUN pip install poetry

# Add Poetry to PATH
ENV PATH="/root/.local/bin:$PATH"
ENV POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=1 \
    POETRY_VIRTUALENVS_CREATE=0 \
    POETRY_CACHE_DIR=/tmp/poetry_cache

COPY . .

ENV PYTHONPATH=/backend


RUN poetry config virtualenvs.create false

RUN poetry install --no-root

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
