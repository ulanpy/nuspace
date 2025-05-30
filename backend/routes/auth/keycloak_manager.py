from pathlib import Path

import httpx
from authlib.integrations.starlette_client import OAuth
from cachetools import TTLCache
from dotenv import load_dotenv
from jose import jwt
from jwt import PyJWKClient
from pydantic_settings import BaseSettings

from backend.core.configs.config import ENV_DIR

load_dotenv(ENV_DIR)


class KeyCloakManager(BaseSettings):
    KEYCLOAK_URL: str
    REALM: str
    KEYCLOAK_CLIENT_ID: str
    KEYCLOAK_CLIENT_SECRET: str
    KEYCLOAK_REDIRECT_URI: str
    client_kwargs: dict = {
        "scope": "openid profile email",
    }

    _oauth: OAuth | None = None
    _jwks_client: PyJWKClient | None = None
    _jwks_cache = TTLCache(maxsize=1, ttl=3600)  # Cache JWKS for 1 hour

    @property
    def JWKS_URI(self):
        return f"{self.KEYCLOAK_URL}/realms/{self.REALM}/protocol/openid-connect/certs"

    class Config:
        env_file = Path(".env").resolve()
        extra = "allow"

    @property
    def oauth(self):
        if self._oauth is None:
            self.initialize_oauth()
        return self._oauth

    @property
    def SERVER_METADATA_URL(self):
        return f"{self.KEYCLOAK_URL}/realms/{self.REALM}/.well-known/openid-configuration"

    def initialize_oauth(self):
        """Initialize OAuth with Keycloak configured to use Google as the identity provider"""
        self._oauth = OAuth()
        self._oauth.register(
            name=self.__class__.__name__.lower(),  # Dynamic provider name
            client_id=self.KEYCLOAK_CLIENT_ID,
            client_secret=self.KEYCLOAK_CLIENT_SECRET,
            server_metadata_url=self.SERVER_METADATA_URL,
            client_kwargs=self.client_kwargs,
        )

    async def get_pub_key(self, token: str):
        """Fetch and cache Keycloak's public key for JWT validation."""
        if "keys" not in self._jwks_cache:
            async with httpx.AsyncClient() as client:
                response = await client.get(self.JWKS_URI)
                response.raise_for_status()
                self._jwks_cache["keys"] = response.json()["keys"]

        # Use PyJWKClient to extract the signing key from the cached keys
        if not self._jwks_client:
            custom_headers = {
                # Use a common browser User-Agent or one identifying your app
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/135.0.0.0 Safari/537.36"
                )
                # Alternatively: "User-Agent": "NurosBackend/1.0 (Authentication Key Fetch)"
            }

            # Pass headers during PyJWKClient initialization
            # Make sure to include any other options you were already using
            # (like cache_jwk_set, lifespan)
            self._jwks_client = PyJWKClient(self.JWKS_URI, headers=custom_headers)  # <-- Add this

        return self._jwks_client.get_signing_key_from_jwt(token).key

    async def refresh_access_token(self, refresh_token: str) -> dict:
        """Request a new access token using a refresh token."""
        token_url = f"{self.KEYCLOAK_URL}/realms/{self.REALM}/protocol/openid-connect/token"

        async with httpx.AsyncClient() as client:
            response = await client.post(
                token_url,
                data={
                    "grant_type": "refresh_token",
                    "client_id": self.KEYCLOAK_CLIENT_ID,
                    "client_secret": self.KEYCLOAK_CLIENT_SECRET,
                    "refresh_token": refresh_token,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

        response.raise_for_status()
        return response.json()

    async def revoke_offline_refresh_token(self, refresh_token: str) -> None:
        """Revoke the offline refresh token in Keycloak."""
        revoke_url = f"{self.KEYCLOAK_URL}/realms/{self.REALM}/protocol/openid-connect/revoke"

        async with httpx.AsyncClient() as client:
            response = await client.post(
                revoke_url,
                data={
                    "client_id": self.KEYCLOAK_CLIENT_ID,
                    "client_secret": self.KEYCLOAK_CLIENT_SECRET,
                    "token": refresh_token,
                    "token_type_hint": "refresh_token",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

        response.raise_for_status()  # Выкидывает исключение при ошибке

    async def validate_keycloak_token(self, token: str) -> dict:
        """Validate a keycloak JWT token"""
        return jwt.decode(
            token,
            key=await self.get_pub_key(token),
            algorithms=["RS256"],
            audience="account",
            issuer=f"{self.KEYCLOAK_URL}/realms/{self.REALM}",
        )
