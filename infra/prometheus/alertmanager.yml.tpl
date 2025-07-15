global:
  resolve_timeout: 5m

route:
  receiver: 'telegram'

receivers:
  - name: 'telegram'
    telegram_configs:
      - bot_token: '${TELEGRAM_BOT_TOKEN}'
        chat_id: ${TELEGRAM_CHAT_ID}
        message: |
          [{{ .Status | toUpper }}] {{ .CommonAnnotations.summary }}
          {{ range .Alerts }}
          Description: {{ .Annotations.description }}
          {{ end }} 