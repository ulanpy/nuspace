from google.oauth2 import id_token
from google.auth.transport import requests
from fastapi import HTTPException, Request, Response, status
import redis
from jose import jwt, JWTError
from datetime import timedelta
from cryptography.fernet import Fernet
from sqlalchemy.ext.asyncio import AsyncSession


from backend.routes.auth.schemas import *
from backend.core.configs.config import *
from backend.routes.auth.cruds import get_user_role
from backend.routes.auth.cruds import get_user_refresh_token
from backend.common.schemas import JWTSchema
from backend.routes.auth.keycloak_manager import KeyCloakManager

fernet = Fernet(fernet_key)
redis_client = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)


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



def cache_google_access_token(id_token_str: str | None, access_token: str = None, expires_in: int = 3600):
    redis_client.setex(f"user:{id_token_str}:google_access_token", expires_in, access_token)


def get_google_access_token(id_token_str: str):
    cached_token = redis_client.get(f"user:{id_token_str}:google_access_token")
    if cached_token:
        # Use the token
        return cached_token
    else:
        pass


async def exchange_code_for_credentials(request: Request):
    kc: KeyCloakManager = request.app.state.kc_manager
    token = await getattr(kc.oauth, kc.__class__.__name__.lower()).authorize_access_token(request)
    return token


# Dependency for token handling
async def process_tokens(token: dict, request: Request, session: AsyncSession) -> (str, str):
    cache_google_access_token(token["id_token"], token["access_token"])
    encrypted_refresh_token = fernet.encrypt(token["refresh_token"].encode()).decode()
    return encrypted_refresh_token

# Helper for user object creation
async def create_user_schema(creds: dict) ->  UserSchema:
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

from httpx import AsyncClient
async def refresh_access_token(refresh_token: str, kc: KeyCloakManager) -> dict | HTTPException:
    """Refresh access token using KeycloakManager's OAuth client."""
    print("Refreshing access token...")
    try:
        creds = await kc.refresh_access_token(refresh_token=refresh_token)
        return creds
    except HTTPException:
        raise HTTPException(status_code=402, detail="Invalid refresh token")



async def revoke_token(session: AsyncSession, jwt_data: JWTSchema):
    token: str = await get_user_refresh_token(session, jwt_data)
    if not token:
        raise HTTPException(status_code=400, detail="No refresh token found for user")
    async with AsyncClient() as client:
        decrypted_refresh_token = fernet.decrypt(token.encode()).decode()
        revoke_url = f"https://oauth2.googleapis.com/revoke?token={decrypted_refresh_token}"
        response = await client.post(revoke_url)
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to revoke Google refresh token")
