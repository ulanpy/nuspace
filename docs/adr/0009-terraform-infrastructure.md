# ADR 0009: Terraform Infrastructure

## Status

Accepted

## Context

The project needed reproducible, version-controlled infrastructure across staging and production environments on Google Cloud.

## Decision

**Remote state backend:**
- Bucket: `gs://nuspace-terraform-state/` (in `nuspace-staging` project)
- Workspaces: `default` → staging, `production` → production
- Versioning enabled for state recovery

**VM service account (`nuspace-vm-sa`):**
- Automatic GCP authentication via metadata server
- CRUD on media buckets
- Pub/Sub access for GCS notifications

**Registrar schedule sync:**
- Cloud Run Job `schedule-sync-job` (daily 03:00 UTC)
- Parses registrar PDFs → writes JSON to GCS
- FastAPI downloads JSON into Meilisearch on startup and on GCS OBJECT_FINALIZE events

**Security:**
- Service account keys in `creds/` (gitignored)
- `backend.tfbackend` gitignored (contains credential paths)
- State bucket has uniform bucket-level access, public access prevention, versioning
- WIF used for CI/CD (no static keys — see ADR 0001)

**Environments:**
- Staging: `nuspace-staging` project → `nuspace-staging` environment
- Production: `nuspace2025` project → `nuspace2025` environment

## Consequences

- Infrastructure is reproducible from code
- State is protected from concurrent modifications (locking)
- No static credentials in CI/CD
- Environment isolation via workspaces

## Related

- ADR 0001 (WIF for CI/CD)
