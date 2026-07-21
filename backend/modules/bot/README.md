# Telegram bot module

Private commands: `/start`, `/course`, `/post`  
Dev group: `/killswitch`

Layers: handlers → services → `repository.py` (`BotUserRepository`, `EventBotSubmissionRepository`).

## Localization

Source strings use Russian msgids; default locale is `en`. Compile catalogs before deploy:

```bash
msgfmt backend/modules/bot/locales/ru/LC_MESSAGES/messages.po -o backend/modules/bot/locales/ru/LC_MESSAGES/messages.mo
msgfmt backend/modules/bot/locales/en/LC_MESSAGES/messages.po -o backend/modules/bot/locales/en/LC_MESSAGES/messages.mo
msgfmt backend/modules/bot/locales/kz/LC_MESSAGES/messages.po -o backend/modules/bot/locales/kz/LC_MESSAGES/messages.mo
```

Per-user locale is read from Redis key `language:{telegram_user_id}` (falls back to `en`).
