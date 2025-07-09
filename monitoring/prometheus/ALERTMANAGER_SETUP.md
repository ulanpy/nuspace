# Alertmanager Template Setup

This setup uses `envsubst` to dynamically generate Alertmanager configuration from environment variables.

## Files

- `prometheus/alertmanager.yml.tpl` - Template file with environment variable placeholders
- `scripts/start-alertmanager.sh` - Startup script that processes the template

## Environment Variables

The following environment variables must be set:

- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token
- `TELEGRAM_CHAT_ID` - Your Telegram chat ID

## How it works

1. The startup script checks for required environment variables
2. `envsubst` processes the template file, replacing `${VARIABLE_NAME}` with actual values
3. The generated configuration is validated using Alertmanager's `--check-config` flag
4. Alertmanager starts with the generated configuration

## Usage

1. Set your environment variables:
   ```bash
   export TELEGRAM_BOT_TOKEN="your_bot_token"
   export TELEGRAM_CHAT_ID="your_chat_id"
   ```

2. Start the monitoring stack:
   ```bash
   # Development
   docker-compose -f dev.docker-compose.monitoring.yaml up -d
   
   # Production
   docker-compose -f prod.docker-compose.monitoring.yaml up -d
   ```

## Template Syntax

The template uses `envsubst` syntax:
- `${VARIABLE_NAME}` - Replaced with environment variable value
- `${VARIABLE_NAME:-default}` - Replaced with environment variable value or default if not set

## Security Notes

- Never commit actual bot tokens or chat IDs to version control
- Use environment variables or Docker secrets for sensitive data
- The template file contains placeholders, not actual credentials 