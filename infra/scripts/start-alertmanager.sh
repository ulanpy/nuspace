#!/bin/bash

# Exit on any error
# tells to exit the script if any command fails e.g false
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

# Process template with envsubst if available, otherwise use sed
echo "Processing Alertmanager template..."
if command -v envsubst >/dev/null 2>&1; then
    envsubst < /etc/alertmanager/alertmanager.yml.tpl > /etc/alertmanager/alertmanager.yml
else
    # Fallback using sed for environment variable substitution
    sed "s/\${TELEGRAM_BOT_TOKEN}/$TELEGRAM_BOT_TOKEN/g; s/\${TELEGRAM_CHAT_ID}/$TELEGRAM_CHAT_ID/g" \
        /etc/alertmanager/alertmanager.yml.tpl > /etc/alertmanager/alertmanager.yml
fi

# Start Alertmanager
echo "Starting Alertmanager..."
exec /bin/alertmanager --config.file=/etc/alertmanager/alertmanager.yml 