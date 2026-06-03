# Auth module

OAuth login (Keycloak + Google), application JWT tokens, and user upsert.

## Layout

| File | Role |
|------|------|
| `api.py` | HTTP routes |
| `service.py` | Login, callback, refresh, `/me`, logout |
| `repository.py` | User upsert and lookups |
| `dependencies.py` | FastAPI `Depends` for `AuthService` and infra |
| `schemas.py` | Request/response DTOs |
| `keycloak_manager.py` | Keycloak OAuth client and JWT validation |
| `app_token.py` | Application JWT minting and validation |
| `oauth.py` | Authorization code exchange (Authlib) |
| `cookies.py` | Auth cookie helpers |
| `mock.py` | Dev-only mock users (`MOCK_KEYCLOAK`) |

## Dev URLs

| Config | Purpose |
|--------|---------|
| `DEV_APP_URL` / `HOME_URL` | Default browser origin (`http://localhost`) when no request context |
| Request `Host` / `X-Forwarded-*` | OAuth redirect and post-login return (localhost vs tunnel) |
| `PUBLIC_WEBHOOK_URL` | Telegram webhook, GCS Pub/Sub push, shareable TG notification links |

Login from `http://localhost` stays on localhost; login from a shared tunnel URL uses that tunnel for callbacks. Webhooks always target the cloudflared URL when it is up.

## Flow

1. `GET /api/login` → Keycloak (or mock callback in dev).
2. `GET /api/auth/callback` → exchange code, upsert user, set cookies.
3. Protected routes use `get_creds_or_401` in `backend/common/dependencies.py` (Keycloak + app token cookies).

Global auth dependencies (`KeyCloakManager`, `AppTokenManager`) are initialized in `backend/lifespan.py` on `app.state`.
