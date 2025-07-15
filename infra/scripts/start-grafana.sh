#!/bin/bash

# Exit on any error
set -e

# Check if required environment variables are set
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "ERROR: TELEGRAM_BOT_TOKEN environment variable is not set"
    exit 1
fi

if [ -z "$TELEGRAM_CHAT_ID" ]; then
    echo "ERROR: TELEGRAM_CHAT_ID environment variable is not set"
    exit 1
fi

# Process Grafana alerting templates
echo "Processing Grafana alerting templates..."

# Process contact-points template
if command -v envsubst >/dev/null 2>&1; then
    envsubst < /etc/grafana/provisioning/alerting/contact-points.yaml.tpl > /etc/grafana/provisioning/alerting/contact-points.yaml
else
    # Fallback using sed for environment variable substitution
    sed "s/\${TELEGRAM_BOT_TOKEN}/$TELEGRAM_BOT_TOKEN/g; s/\${TELEGRAM_CHAT_ID}/$TELEGRAM_CHAT_ID/g" \
        /etc/grafana/provisioning/alerting/contact-points.yaml.tpl > /etc/grafana/provisioning/alerting/contact-points.yaml
fi

echo "Grafana alerting templates processed successfully"

# Start Grafana
echo "Starting Grafana..."
exec /run.sh 