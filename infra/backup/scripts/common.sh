#!/usr/bin/env bash
set -euo pipefail

: "${PGHOST:=postgres}"
: "${PGPORT:=5432}"
: "${DB_USER:?DB_USER is required}"
: "${DB_PASSWORD:?DB_PASSWORD is required}"
: "${DB_NAME:?DB_NAME is required}"

export PGUSER="${DB_USER}"
export PGDATABASE="${DB_NAME}"
export PGPASSWORD="${DB_PASSWORD}"

log() {
  printf '[%s] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*"
}

wait_for_postgres() {
  for _ in $(seq 1 30); do
    if pg_isready -h "${PGHOST}" -p "${PGPORT}" -U "${DB_USER}" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  log "postgres is not ready"
  return 1
}
