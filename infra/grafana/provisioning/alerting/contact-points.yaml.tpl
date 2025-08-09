apiVersion: 1

contactPoints:
  - orgId: 1
    name: Telegram
    receivers:
      - uid: telegram
        type: telegram
        disableResolveMessage: false
        allowedit: true
        settings:
          bottoken: '${TELEGRAM_BOT_TOKEN}'
          chatid: '${TELEGRAM_CHAT_ID}'
          message: |
            {{ template "default.message" . }} 