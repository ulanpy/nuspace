# ADR 0006: Monitoring Stack

## Status

Accepted

## Context

The project needed observability for both local development and production/staging environments.

## Decision

**Stack:** Grafana + Prometheus + Loki + Grafana Alloy + Node Exporter + cAdvisor + Pyroscope

- **Grafana Alloy** — collector of metrics and logs (scrapes FastAPI, cAdvisor, Node Exporter)
- **Prometheus** — metrics store
- **Grafana Loki** — logs store
- **Grafana** — visualization and alerting
- **Pyroscope** — continuous CPU profiles from FastAPI (for k6 runs)

**Access:** Via WireGuard VPN only. Services available at `vpn.nuspace.kz/monitoring`.

**Alerting:** Grafana Unified Alerting with Telegram contact point. `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `infra/.env`.

**Production auth:** Google Cloud metadata server (no service account keys).

## Consequences

- Full observability without exposing services publicly
- Alert notifications reach the team via Telegram
- Pyroscope enables performance regression detection during load tests

## Related

- ADR 0008 (WireGuard VPN)
- ADR 0002 (SSH access via VPN)
