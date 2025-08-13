from fastapi import Request, Response
from jose import jwt as jose_jwt

from backend.core.configs.config import config
from backend.routes.auth.schemas import UserRole, UserSchema, UserScope


async def exchange_code_for_credentials(request: Request):
    # This function needs KeyCloakManager, so the import should be active if it was commented out
    from backend.routes.auth.keycloak_manager import (
        KeyCloakManager,  # Ensure it's imported for this func
    )

    kc: KeyCloakManager = request.app.state.kc_manager
    provider = getattr(kc.oauth, kc.__class__.__name__.lower())
    token = await provider.authorize_access_token(request)
    # Ensure userinfo is present for downstream user creation
    try:
        userinfo = await provider.userinfo(token=token)
        token["userinfo"] = userinfo
    except Exception:
        # Fallback to ID token claims if userinfo endpoint is unavailable
        try:
            userinfo = await provider.parse_id_token(request, token)
            token["userinfo"] = userinfo
        except Exception:
            pass
    return token


# Helper for user object creation
async def create_user_schema(creds: dict) -> UserSchema:
    userinfo = creds.get("userinfo")
    if not userinfo:
        id_token = creds.get("id_token")
        if id_token:
            try:
                claims = jose_jwt.get_unverified_claims(id_token)
                name = claims.get("name") or ""
                parts = name.split(" ") if name else []
                given_name = claims.get("given_name") or (parts[0] if parts else "")
                family_name = claims.get("family_name") or (parts[1] if len(parts) > 1 else "")
                userinfo = {
                    "email": claims.get("email"),
                    "given_name": given_name,
                    "family_name": family_name,
                    "picture": claims.get("picture"),
                    "sub": claims.get("sub"),
                }
            except Exception:
                userinfo = None
    if not userinfo:
        raise KeyError("userinfo")
    return UserSchema(
        email=userinfo["email"],
        role=UserRole.default,
        scope=UserScope.allowed,
        name=userinfo["given_name"],
        surname=userinfo["family_name"],
        picture=userinfo.get("picture"),
        sub=userinfo["sub"],
    )


def set_kc_auth_cookies(response: Response, creds: dict):
    response.set_cookie(
        key=config.COOKIE_ACCESS_NAME,
        value=creds["access_token"],
        httponly=True,
        secure=not config.IS_DEBUG,  # False if config.IS_DEBUG is True AND reverse in otherwise
        samesite="Lax",  # Mitigate CSRF attacks
        max_age=3600,  # 1 hour
    )
    response.set_cookie(
        key=config.COOKIE_REFRESH_NAME,
        value=creds["refresh_token"],
        httponly=True,
        secure=not config.IS_DEBUG,
        samesite="Lax",
        max_age=30 * 24 * 60 * 60,  # 30 days
    )


def unset_kc_auth_cookies(response: Response):
    response.delete_cookie(key=config.COOKIE_ACCESS_NAME)
    response.delete_cookie(key=config.COOKIE_REFRESH_NAME)
