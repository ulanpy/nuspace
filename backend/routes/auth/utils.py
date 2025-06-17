from fastapi import Request, Response

from backend.core.configs.config import config
from backend.routes.auth.schemas import UserRole, UserSchema, UserScope


async def exchange_code_for_credentials(request: Request):
    # This function needs KeyCloakManager, so the import should be active if it was commented out
    from backend.routes.auth.keycloak_manager import (
        KeyCloakManager,  # Ensure it's imported for this func
    )

    kc: KeyCloakManager = request.app.state.kc_manager
    token = await getattr(kc.oauth, kc.__class__.__name__.lower()).authorize_access_token(request)
    return token


# Helper for user object creation
async def create_user_schema(creds: dict) -> UserSchema:
    userinfo = creds["userinfo"]
    return UserSchema(
        email=userinfo["email"],
        role=UserRole.default,
        scope=UserScope.allowed,
        name=userinfo["given_name"],
        surname=userinfo["family_name"],
        picture=userinfo["picture"],
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
