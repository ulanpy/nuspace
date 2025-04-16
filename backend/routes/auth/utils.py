from google.oauth2 import id_token
from google.auth.transport import requests
from fastapi import HTTPException, Request, Response, status
import redis
from jose import jwt, JWTError

from sqlalchemy.ext.asyncio import AsyncSession


from backend.routes.auth.schemas import *
from backend.core.configs.config import *
from backend.routes.auth.cruds import get_user_role
from backend.routes.auth.keycloak_manager import KeyCloakManager


redis_client = redis.Redis(host=config.redis_host, port=config.redis_port, decode_responses=True)


async def validate_access_token(access_token: str, kc: KeyCloakManager) -> dict | HTTPException:
    try:
        signing_key = await kc.get_pub_key(access_token)

        decoded_access_token = jwt.decode(
            access_token,
            signing_key,
            algorithms=["RS256"],
            audience="account",  # Verify this matches your Keycloak client
            issuer=f"{kc.KEYCLOAK_URL}/realms/{kc.REALM}"
        )
        return decoded_access_token

    except JWTError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Auth failed")


def validate_access_token_sync(access_token: str, kc: KeyCloakManager) -> dict | HTTPException:
    try:
        signing_key = kc.get_pub_key_sync(access_token)

        decoded_access_token = jwt.decode(
            access_token,
            signing_key,
            algorithms=["RS256"],
            audience="account",  # Verify this matches your Keycloak client
            issuer=f"{kc.KEYCLOAK_URL}/realms/{kc.REALM}"
        )
        return decoded_access_token

    except JWTError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Auth failed")


async def exchange_code_for_credentials(request: Request):
    kc: KeyCloakManager = request.app.state.kc_manager
    token = await getattr(kc.oauth, kc.__class__.__name__.lower()).authorize_access_token(request)
    return token



# Helper for user object creation
async def create_user_schema(creds: dict) ->  UserSchema:
    userinfo = creds["userinfo"]
    return UserSchema(
        email=userinfo["email"],
        role=UserRole.default,
        scope=UserScope.allowed,
        name=userinfo["given_name"],
        surname=userinfo["family_name"],
        picture="asd", #userinfo["picture"],
        sub=userinfo["sub"],
    )


def set_auth_cookies(response: Response, creds: dict):
    response.set_cookie(
        key="access_token",
        value=creds["access_token"],
        httponly=True,  # Prevent JavaScript access
        secure=False,   # Send only over HTTPS
        samesite="Lax"  # Mitigate CSRF attacks
    )
    response.set_cookie(
        key="refresh_token",
        value=creds["refresh_token"],
        httponly=True,  # Prevent JavaScript access
        secure=False,  # Send only over HTTPS
        samesite="Lax"  # Mitigate CSRF attacks
    )
def unset_auth_cookies(response: Response):
    response.delete_cookie(
        key="access_token",  # The name of the cookie to be deleted
        httponly=True,        # Ensures the cookie is not accessible via JavaScript
        secure=False,         # Set this to True in production with HTTPS
        samesite="Lax"        # Mitigate CSRF attacks
    )

    response.delete_cookie(
            key="refresh_token",  # The name of the cookie to be deleted
            httponly=True,        # Ensures the cookie is not accessible via JavaScript
            secure=False,         # Set this to True in production with HTTPS
            samesite="Lax"        # Mitigate CSRF attacks
        )

async def refresh_access_token(refresh_token: str, kc: KeyCloakManager) -> dict | HTTPException:
    """Refresh access token using KeycloakManager's OAuth client."""
    print("Refreshing access token... ")
    try:
        creds = await kc.refresh_access_token(refresh_token=refresh_token)
        return creds
    except HTTPException:
        raise HTTPException(status_code=402, detail="Invalid refresh token")

