# Monitoring

[![Grafana](https://img.shields.io/badge/Grafana-F46800?logo=grafana&logoColor=white)](http://localhost:3000)
[![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?logo=prometheus&logoColor=white)](http://localhost:9090)
[![Loki](https://img.shields.io/badge/Loki-00B3A4?logo=grafana&logoColor=white)](http://localhost:3100)
[![Grafana Alloy](https://img.shields.io/badge/Grafana%20Alloy-3A3A3A?logo=grafana&logoColor=white)](http://localhost:12345)
[![Node Exporter](https://img.shields.io/badge/Node%20Exporter-E6522C?logo=prometheus&logoColor=white)](#stack-components)
[![cAdvisor](https://img.shields.io/badge/cAdvisor-2496ED?logo=docker&logoColor=white)](#stack-components)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](http://localhost/api/metrics)

This directory contains monitoring infrastructure for local development and production/staging environments.

## Local Development Setup

### Prerequisites
1. Ensure following credential is set in `infra/.env`:

```
# Telegram Chat where bot should send logs
TELEGRAM_CHAT_ID=123
```

2. Start the monitoring services (run from root folder):
```sh
cd infra
docker compose -f docker-compose --profile monitoring up -d 
```

### Service Addresses

| Service                                                         | Addresses               |
| --------------------------------------------------------------- | ----------------------- |
| Grafana                                                         | `localhost:3000`        |
| Prometheus                                                      | `localhost:9090`        |
| Alloy                                                           | `localhost:12345 `      |
| Loki <br/>(No UI, if running `404 page not found` is displayed) | `localhost:3100 `       |
| FastAPI Metrics endpoint                                        | `localhost/api/metrics` |

### Stack Components

- **Grafana Alloy** – collector of metrics and logs
  - Scraper from FastAPI
  - Scraper from Cadvisor exporter
  - Scraper from Node Exporter exporter
- **Prometheus** – metrics store
- **Grafana Loki** – logs store
- **Grafana** – Visualization

## Production/Staging Setup

### Authentication
Production and staging environments use Google Cloud metadata server for authentication instead of service account keys.

2. Update the same Telegram credentials in relevant fields in `monitoring/prometheus/alertmanager.yml`.

3. Start the monitoring services (in prod/stage they started together with all services):

   ```sh
   cd infra
   docker compose -f prod.docker-compose up -d
   ```

## Explanation

For explanation look [here](https://github.com/sagyzdop/simple_monitoring) and a future post at [blog.sagyzdop.com](https://blog.sagyzdop.com).
