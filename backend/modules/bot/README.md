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

## Event extraction (`/post`)

Uses **Gemini** via `google-genai` Interactions API (`GeminiEventExtractor`).

| Environment | Mode | Auth |
|-------------|------|------|
| Local (`IS_DEBUG=true`) | Developer API | `GEMINI_API_KEY` in `.env` |
| Prod VM (`IS_DEBUG=false`) | Enterprise (GCP) | VM service account (ADC) |

Optional overrides: `GEMINI_USE_ENTERPRISE`, `GEMINI_MODEL` (default `gemini-3-flash-preview`), `GEMINI_LOCATION` (default `global`).

Prod requires Terraform: `aiplatform.googleapis.com` enabled + `roles/aiplatform.user` on the VM service account.
