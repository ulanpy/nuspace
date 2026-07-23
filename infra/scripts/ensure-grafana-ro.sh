#!/usr/bin/env bash
# Idempotent bootstrap of a SELECT-only Postgres role for Grafana.
# Safe to run on every compose up (fresh VM, restore, or routine restart).
#
# Secrets stay in the process environment only — never on the psql argv,
# never in log lines, never via `psql -v ...password=...` (visible in `ps`).
set -euo pipefail
set +x

: "${DB_HOST:=postgres}"
: "${DB_PORT:=5432}"
: "${DB_USER:?DB_USER is required}"
: "${DB_PASSWORD:?DB_PASSWORD is required}"
: "${DB_NAME:?DB_NAME is required}"
: "${GRAFANA_DB_USER:=grafana_ro}"
: "${GRAFANA_DB_PASSWORD:?GRAFANA_DB_PASSWORD is required}"

# \getenv below reads the child environment; defaults above must be exported.
export DB_USER DB_NAME GRAFANA_DB_USER GRAFANA_DB_PASSWORD
export PGUSER="${DB_USER}"
export PGDATABASE="${DB_NAME}"
export PGPASSWORD="${DB_PASSWORD}"

log() {
  printf '[%s] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*"
}

log "Waiting for Postgres at ${DB_HOST}:${DB_PORT}..."
for _ in $(seq 1 60); do
  if pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
if ! pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" >/dev/null 2>&1; then
  log "postgres is not ready"
  exit 1
fi

log "Ensuring role ${GRAFANA_DB_USER} (SELECT) on database ${DB_NAME}..."

# Passwords via \getenv (not -v): keeps secrets off argv / docker inspect Args.
# format(%I/%L) + \gexec avoids string-concat SQL injection; \gexec does not echo SQL.
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
  --set=ON_ERROR_STOP=1 \
<<'SQL'
\getenv grafana_user GRAFANA_DB_USER
\getenv grafana_password GRAFANA_DB_PASSWORD
\getenv db_name DB_NAME
\getenv app_user DB_USER

SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'grafana_user', :'grafana_password')
WHERE NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = :'grafana_user')\gexec

SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'grafana_user', :'grafana_password')\gexec

GRANT CONNECT ON DATABASE :"db_name" TO :"grafana_user";
GRANT USAGE ON SCHEMA public TO :"grafana_user";
GRANT SELECT ON ALL TABLES IN SCHEMA public TO :"grafana_user";
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO :"grafana_user";

SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT ON TABLES TO %I',
  :'app_user',
  :'grafana_user'
)\gexec

SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT ON SEQUENCES TO %I',
  :'app_user',
  :'grafana_user'
)\gexec
SQL

log "Role ${GRAFANA_DB_USER} is ready"
