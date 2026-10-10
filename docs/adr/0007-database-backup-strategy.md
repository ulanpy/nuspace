# ADR 0007: Database Backup Strategy

## Status

Accepted

## Context

A 2026-06-09 incident where `docker compose down -v` deleted `postgres-data` proved that local volumes are not backups. Keycloak sessions survived (external), but the local database did not.

## Decision

**Two-layer backup strategy, both writing off-site to GCS:**

| Layer | Tool | Purpose |
|-------|------|---------|
| Physical + PITR | WAL-G | Minimal data loss, point-in-time recovery |
| Logical fallback | pg_dump | If physical backup is corrupt, cross-version restore, selective restore |

**Architecture:**
- `postgres` container runs `wal-g wal-push` via `archive_command` (continuous WAL archiving)
- `backup` sidecar runs `wal-g backup-push` daily at 04:00 UTC and `pg_dump` every 6 hours
- GCS auth via VM service account (ADC through metadata server)

**Retention:**
- GCS lifecycle: 30 days
- GCS soft delete: 7 days
- WAL-G full chain managed by bucket lifecycle

**Not backed up by this system:** Redis, RabbitMQ, Grafana, Prometheus, Loki data; media files (separate bucket); VM boot disk snapshots.

## Consequences

- Database can be recovered to any point in time within the retention window
- Logical backups provide a fallback if physical backups are corrupted
- Off-site storage survives local disk/VM failures
- Recovery requires a separate VM or stopping FastAPI (downtime)

## Related

- ADR 0001 (WIF for CI/CD authentication)
