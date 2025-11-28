# Authentication System Documentation

## Overview

Dual-token authentication system using **Keycloak** (with Google OAuth) as the Identity Provider and application-specific JWT tokens for authorization.

**Token Types:**
- **Keycloak Tokens**: Identity management (access_token, refresh_token, id_token) - validated via JWKS
- **App Tokens**: Application roles, permissions, and community access - HMAC-SHA256 signed

## Architecture

### KeyCloakManager (`keycloak_manager.py`)
- OAuth2 client configuration via Authlib
- JWT validation using JWKS (1-hour cache TTL)
- Token refresh and revocation
- Mock mode for development

### AppTokenManager (`app_token.py`)
- Creates/validates application JWT tokens
- Claims: `sub`, `role`, `communities[]`, `tg_id`, `department_id`, `exp`
- Token expiry: configurable (default 14 minutes)

### Authentication Router (`auth.py`)
- Endpoint handlers for login, callback, refresh, logout
- CSRF protection via Redis-stored state
- Automatic token refresh via `get_creds_or_401` dependency

## Authentication Flows

### Web Browser Flow
1. `GET /api/login` → Generate CSRF state (Redis, 10min TTL) → Redirect to Keycloak
2. Keycloak OAuth → `GET /api/auth/callback` with authorization code
3. Exchange code for tokens → Validate Keycloak JWT → Upsert user → Create app token
4. Set cookies (access_token, refresh_token, app_token) → Redirect to home

### Token Refresh
- Automatic: `get_creds_or_401` dependency refreshes expired Keycloak tokens and re-issues app tokens
- Manual: `POST /api/refresh-token` explicitly refreshes both token types

## Security

**CSRF Protection:**
- State parameter stored in Redis (10-minute TTL)
- Validated on callback, auto-deleted after use

**Token Validation:**
- Keycloak: RS256 JWT verified against JWKS endpoint
- App tokens: HS256 JWT with secret key validation
- Both validated on each protected request

**Cookie Configuration:**
```python
httponly=True, secure=not IS_DEBUG, samesite="Lax", max_age=token_expiry
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/login` | GET | Initiate OAuth flow (supports `?return_to=` and `?mock_user=` for dev) |
| `/api/auth/callback` | GET | OAuth callback handler |
| `/api/refresh-token` | POST | Explicit token refresh (returns new tokens) |
| `/api/me` | GET | Current user profile (requires auth) |
| `/api/logout` | GET | Revoke refresh token and clear cookies |
| `/api/connect-tg` | POST | Generate Telegram binding link |

## Configuration

**Required Environment Variables:**
```bash
# Keycloak
KEYCLOAK_URL=https://your-keycloak-instance.com
REALM=your-realm
KEYCLOAK_CLIENT_ID=your-client-id
KEYCLOAK_CLIENT_SECRET=your-client-secret

# Application
APP_JWT_SECRET_256=your-256-bit-secret
APP_TOKEN_EXPIRY_MINUTES=14
COOKIE_APP_NAME=app_token
COOKIE_REFRESH_NAME=refresh_token
COOKIE_ACCESS_NAME=access_token

# Development
MOCK_KEYCLOAK=false  # Enable mock auth bypass
IS_DEBUG=true
```

**Redis:** Used for CSRF state storage and credential caching (TTL-based cleanup)

## Development

**Mock Authentication:**
- Set `MOCK_KEYCLOAK=true`
- Access `/api/login?mock_user=<id>` to bypass Keycloak
- Uses pre-generated test credentials, same validation flow

**Token Management:**
- Protected endpoints use `get_creds_or_401` dependency for automatic refresh
- App tokens re-issued when Keycloak tokens refresh or app token expires
- Subject mismatch between tokens triggers app token re-issue
