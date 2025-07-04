# Monitoring 

## Running Monitoring Locally 

1. Add Grafana credentials to `.env`:

```
GF_SECURITY_ADMIN_USER=your_login
GF_SECURITY_ADMIN_PASSWORD=your_secure_password
```

Also note that `TG_API_KEY` field in the `.env` is required for Grafana alerting. Grafana won't start if value is not provided.

2. Start the monitoring services `docker compose -f ./monitoring/docker-compose.monitoring.yaml up -d` (run inside root folder).

## Service Addresses

| Service                                                         | Addresses               |
| --------------------------------------------------------------- | ----------------------- |
| Grafana                                                         | `localhost:3000`        |
| Prometheus                                                      | `localhost:9090`        |
| Alloy                                                           | `localhost:12345 `      |
| Loki </br>(No UI, if running `404 page not found` is displayed) | `localhost:3100 `       |
| FastAPI Metrics endpoint                                        | `localhost/api/metrics` |


## Stack

- **Grafana Alloy** – collector of metrics and logs 
  - Scraper from FastAPI
  - Scraper from Cadvisor exporter
  - Scraper from Node Exporter exporter
- **Prometheus** – metrics store
- **Grafana Loki** – logs store
- **Grafana** – Visualization

## Using Google Bucket for logs storage

1. Add `nuspace_bucket.json` under `/monitoring` directory. It is a service account credentials that has bucket access. Obtain it from [Google Cloud Console](https://console.cloud.google.com).
2. Add Grafana credentials to `.env`:

```
GF_SECURITY_ADMIN_USER=your_login
GF_SECURITY_ADMIN_PASSWORD=your_secure_password
```

Also note that `TG_API_KEY` field in the `.env` is required for Grafana alerting. Grafana won't start if value is not provided.

3. Start the monitoring services `docker compose -f ./monitoring/docker-compose.monitoring.prod.yaml up -d` (run inside root folder).