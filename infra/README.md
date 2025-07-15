# Monitoring

## Running Monitoring Locally

1. Add Grafana credentials to `.env`:

```
# Grafana credentials
GF_SECURITY_ADMIN_USER=your_login
GF_SECURITY_ADMIN_PASSWORD=your_secure_password
```

2. Note that `TELEGRAM_BOT_TOKEN` field in the `.env` is required for Grafana alerting. Grafana won't start if value is not provided. Next, get the chat ID and update the `chatid: "123456789"` field in `/monitoring/grafana/provisioning/alerting/contact-pints.yaml`. [Here](https://stackoverflow.com/a/61215414/23123006) is how to get the chat ID.

3. Update the same Telegram credentials in relevant fields in `monitoring/prometheus/alertmanager.yml`.

4. Start the monitoring services (run inside root folder):
   ```sh
   docker compose -f ./monitoring/docker-compose.monitoring.yaml up -d
   ```

## Service Addresses

| Service                                                         | Addresses               |
| --------------------------------------------------------------- | ----------------------- |
| Grafana                                                         | `localhost:3000`        |
| Prometheus                                                      | `localhost:9090`        |
| Alloy                                                           | `localhost:12345 `      |
| Loki <br/>(No UI, if running `404 page not found` is displayed) | `localhost:3100 `       |
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
2. (THIS WILL PROBABLY CHANGE FOR PROD) Add Grafana credentials to `.env`:

```
# Grafana credentials
GF_SECURITY_ADMIN_USER=your_login
GF_SECURITY_ADMIN_PASSWORD=your_secure_password
```

3. Note that `TELEGRAM_BOT_TOKEN` field in the `.env` is required for Grafana alerting. Grafana won't start if value is not provided. Next, get the chat ID and update the `chatid: "123456789"` field in `/monitoring/grafana/provisioning/alerting/contact-pints.yaml`. [Here](https://stackoverflow.com/a/61215414/23123006) is how to get the chat ID.

4. Update the same Telegram credentials in relevant fields in `monitoring/prometheus/alertmanager.yml`.

5. Start the monitoring services (run inside root folder):

   ```sh
   docker compose -f ./monitoring/docker-compose.monitoring.prod.yaml up -d
   ```

## Next Steps

Next is configuring the endpoints to be accessible over the internet, and securing it with stronger authentication methods, like [Google OAuth](https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/configure-authentication/google/).

## Explanation

For explanation look [here](https://github.com/sagyzdop/simple_monitoring) and a future post at [blog.sagyzdop.com](https://blog.sagyzdop.com).
