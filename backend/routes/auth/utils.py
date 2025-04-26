from fastapi import HTTPException, Request, Response, status
from jose import JWTError, jwt

from backend.core.configs.config import config
from backend.routes.auth.keycloak_manager import KeyCloakManager
from backend.routes.auth.schemas import UserRole, UserSchema, UserScope


async def validate_access_token(
    response: Response, access_token: str, refresh_token: str, kc: KeyCloakManager
) -> dict | None:
    signing_key = await kc.get_pub_key(access_token)
    try:
        decoded_access_token = jwt.decode(
            access_token,
            signing_key,
            algorithms=["RS256"],
            audience="account",  # Verify this
            issuer=f"{kc.KEYCLOAK_URL}/realms/{kc.REALM}",
        )
        return decoded_access_token

    except JWTError as e:
        print(e)
        creds = await kc.refresh_access_token(refresh_token=refresh_token)
        set_auth_cookies(response, creds)
        decoded_access_token = jwt.decode(
            creds["access_token"],
            signing_key,
            algorithms=["RS256"],
            audience="account",  # Verify this
            issuer=f"{kc.KEYCLOAK_URL}/realms/{kc.REALM}",
        )
        return decoded_access_token


def validate_access_token_sync(access_token: str, kc: KeyCloakManager) -> dict | HTTPException:
    try:
        signing_key = kc.get_pub_key_sync(access_token)

        decoded_access_token = jwt.decode(
            access_token,
            signing_key,
            algorithms=["RS256"],
            audience="account",  # Verify this
            issuer=f"{kc.KEYCLOAK_URL}/realms/{kc.REALM}",
        )
        return decoded_access_token

    except JWTError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Auth failed")


async def exchange_code_for_credentials(request: Request):
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
        picture="asd",  # бля ахаххахаха
        sub=userinfo["sub"],
    )


def set_auth_cookies(response: Response, creds: dict):
    response.set_cookie(
        key="access_token",
        value=creds["access_token"],
        httponly=True,
        secure=not config.IS_DEBUG,  # False if config.IS_DEBUG is True AND reverse in otherwise
        samesite="Lax",  # Mitigate CSRF attacks
    )
    response.set_cookie(
        key="refresh_token",
        value=creds["refresh_token"],
        httponly=True,
        secure=not config.IS_DEBUG,
        samesite="Lax",
    )


def unset_auth_cookies(response: Response):
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=not config.IS_DEBUG,
        samesite="Lax",
    )

    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        secure=not config.IS_DEBUG,
        samesite="Lax",
    )
