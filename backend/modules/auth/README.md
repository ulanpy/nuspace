# Auth module

OAuth login (Keycloak + Google), application JWT tokens, and user upsert.

## Layout

| File | Role |
|------|------|
| `api.py` | HTTP routes |
| `service.py` | Login, callback, refresh, `/me`, logout |
| `repository.py` | User upsert and lookups |
| `dependencies.py` | FastAPI `Depends`: cookie auth (`get_creds_or_401`, `get_creds_or_guest`), access-log actor helpers (`mark_access_actor`), `AuthService` wiring |
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
3. Protected routes use `get_creds_or_401` / `get_creds_or_guest` in `backend/modules/auth/dependencies.py` (Keycloak + app token cookies).
4. Those Depends also set `request.state` access-log fields: `user_sub` is the JWT `sub` or JSON `null` (never a sentinel); guest/machine status uses `is_guest` / `actor`. Machine callers use `mark_access_actor(...)` (e.g. Pub/Sub → `actor=pubsub`).

Global auth dependencies (`KeyCloakManager`, `AppTokenManager`) are initialized in `backend/lifespan.py` on `app.state`.
