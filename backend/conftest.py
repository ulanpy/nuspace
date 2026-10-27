"""Root conftest: the environment every backend test runs in.

`Config()` is built at import time from ~25 required variables, so they are
set here, before pytest imports anything under `backend`. They are assigned,
not defaulted: a developer's shell or `infra/.env` must never point the suite
at the dev database, which it truncates between tests.

The values describe production, not local dev (`IS_DEBUG=false`), with two
exceptions: Keycloak is faked through `MOCK_KEYCLOAK`, and the stores are the
throwaway ones in `infra/test.docker-compose.yml`. See `tests/README.md`.
"""

import os

TEST_ENV = {
    "IS_DEBUG": "false",
    "MOCK_KEYCLOAK": "true",
    "NUSPACE": "https://nuspace.kz",
    # Stores: infra/test.docker-compose.yml
    "DB_HOST": "127.0.0.1",
    "DB_PORT": "55432",
    "DB_NAME": "nuspace_test",
    "DB_USER": "postgres",
    "DB_PASSWORD": "postgres",
    "MEILISEARCH_URL": "http://127.0.0.1:57700",
    "MEILISEARCH_MASTER_KEY": "test-master-key",
    # Never connected to: the harness replaces these clients (tests/harness.py).
    "REDIS_HOST": "127.0.0.1",
    "REDIS_PORT": "56379",
    "CELERY_BROKER_URL": "amqp://guest:guest@127.0.0.1:55672/",
    "USE_GCS_EMULATOR": "true",
    "GCS_EMULATOR_HOST": "http://127.0.0.1:54443",
    "BUCKET_NAME": "nuspace-test",
    "GCP_PROJECT_ID": "nuspace-test",
    "GCP_TOPIC_ID": "nuspace-test",
    "PUSH_AUTH_SERVICE_ACCOUNT": "push@nuspace-test.iam.gserviceaccount.com",
    "PUSH_AUTH_AUDIENCE": "nuspace-test",
    "VM_SERVICE_ACCOUNT_EMAIL": "vm@nuspace-test.iam.gserviceaccount.com",
    "TELEGRAM_BOT_TOKEN": "123456:test-token",
    "TG_WEBHOOK_SECRET_TOKEN": "test-webhook-secret",
    "KEYCLOAK_URL": "http://keycloak.invalid",
    "REALM": "nuspace-test",
    "KEYCLOAK_CLIENT_ID": "nuspace-test",
    "KEYCLOAK_CLIENT_SECRET": "nuspace-test",
    # Secrets
    "SESSION_MIDDLEWARE_KEY": "test-session-middleware-key",
    "APP_JWT_SECRET_256": "test-app-jwt-secret-of-at-least-32-bytes",
    # Telemetry off
    "TRACING_ENABLED": "false",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "",
}

os.environ.update(TEST_ENV)

pytest_plugins = ["backend.tests.harness"]
