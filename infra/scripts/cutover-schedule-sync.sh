#!/usr/bin/env bash
# Cutover helper: run schedule-sync Cloud Run Job once and verify the GCS artifact.
#
# Order:
#   1. Deploy backend image that includes schedule_sync_job (CI / docker push)
#   2. terraform apply (creates Job + Scheduler + IAM)
#   3. CI updates job image OR: gcloud run jobs update … --image kamikadze24/fastapi:TAG
#   4. Run this script
#   5. Deploy/restart fastapi on the VM (pulls GCS → Meilisearch)
#
# Usage:
#   ./infra/scripts/cutover-schedule-sync.sh nuspace2025 nuspace-media
#   ./infra/scripts/cutover-schedule-sync.sh nuspace-staging nuspace-media-staging

set -euo pipefail

PROJECT_ID="${1:?project id required (e.g. nuspace2025)}"
BUCKET_NAME="${2:?media bucket required (e.g. nuspace-media)}"
REGION="${REGION:-europe-central2}"
JOB_NAME="${JOB_NAME:-schedule-sync-job}"
OBJECT="${SCHEDULE_SYNC_GCS_OBJECT:-registrar/course_schedule_catalog.json}"
META_OBJECT="${SCHEDULE_SYNC_GCS_META_OBJECT:-registrar/meta.json}"

echo "==> Executing Cloud Run Job ${JOB_NAME} in ${PROJECT_ID}/${REGION}"
gcloud run jobs execute "${JOB_NAME}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --wait

echo "==> Checking GCS artifacts"
gsutil ls -l "gs://${BUCKET_NAME}/${OBJECT}"
gsutil cat "gs://${BUCKET_NAME}/${META_OBJECT}"
echo
echo "==> Next: deploy/restart fastapi on the VM so it pulls GCS → Meilisearch"
echo "    docker logs fastapi --tail 50   # expect: Synced schedule catalog docs from GCS: N"
echo "    docker stats --no-stream fastapi   # CPU should stay low (no pdfplumber spike)"
