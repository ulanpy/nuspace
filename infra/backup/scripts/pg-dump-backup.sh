#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

: "${BACKUPS_BUCKET_NAME:?BACKUPS_BUCKET_NAME is required}"

timestamp="$(date -u +"%Y-%m-%dT%H-%M-%SZ")"
tmp_file="/tmp/${DB_NAME}-${timestamp}.dump.gz"
object_name="pg-dump/postgres/${DB_NAME}/${timestamp}.dump.gz"
destination_uri="gs://${BACKUPS_BUCKET_NAME}/${object_name}"

log "starting pg_dump backup to ${destination_uri}"
wait_for_postgres

pg_dump \
  -h "${PGHOST}" \
  -p "${PGPORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --format=custom \
  --no-owner \
  --no-acl \
  | gzip -c > "${tmp_file}"

# VM SA token (no key file): ask the GCE metadata server for the default SA OAuth token.
# Requires compose extra_hosts so metadata.google.internal resolves inside the container.
access_token="$(
  curl -fsS -H "Metadata-Flavor: Google" \
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token" \
    | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p'
)"

encoded_name="$(printf '%s' "${object_name}" | jq -sRr @uri)"

curl -fsS -X POST \
  -H "Authorization: Bearer ${access_token}" \
  -H "Content-Type: application/gzip" \
  --data-binary @"${tmp_file}" \
  "https://storage.googleapis.com/upload/storage/v1/b/${BACKUPS_BUCKET_NAME}/o?uploadType=media&name=${encoded_name}"

rm -f "${tmp_file}"
log "pg_dump backup uploaded to ${destination_uri}"
