#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

: "${WALG_GS_PREFIX:?WALG_GS_PREFIX is required}"
: "${PGDATA:=/var/lib/postgresql/data}"

if [[ ! -d "${PGDATA}" ]]; then
  log "PGDATA not found (${PGDATA}); mount postgres-data into backup container"
  exit 1
fi

log "starting WAL-G backup-push to ${WALG_GS_PREFIX} from ${PGDATA}"
wait_for_postgres

# Auth to GCS: wal-g Go SDK (ADC) → metadata.google.internal → VM SA token (see compose extra_hosts).
wal-g backup-push "${PGDATA}"
log "WAL-G backup-push completed"
