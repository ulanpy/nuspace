import os

from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from pydantic import Field
from authlib.integrations.starlette_client import OAuth
from pathlib import Path
from starlette.config import Config
from jwt import PyJWKClient
from cachetools import TTLCache
import httpx

env_path = Path(__file__).resolve().parent.parent.parent.parent / "core/configs/.env"
load_dotenv(env_path)


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
        env_file = Path("backend/core/configs/.env").resolve()
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
        """Initialize OAuth with Keycloak configured to use Google as the identity provider."""
        self._oauth = OAuth()
        self._oauth.register(
            name=self.__class__.__name__.lower(),  # Dynamic provider name
            client_id=self.KEYCLOAK_CLIENT_ID,
            client_secret=self.KEYCLOAK_CLIENT_SECRET,
            server_metadata_url=self.SERVER_METADATA_URL,
            client_kwargs=self.client_kwargs
        )
        print("OAuth initialized.")
    async def get_pub_key(self, token: str):
        """Fetch and cache Keycloak's public key for JWT validation."""
        if "keys" not in self._jwks_cache:
            async with httpx.AsyncClient() as client:
                response = await client.get(self.JWKS_URI)
                response.raise_for_status()
                self._jwks_cache["keys"] = response.json()["keys"]

        # Use PyJWKClient to extract the signing key from the cached keys
        if not self._jwks_client:
            self._jwks_client = PyJWKClient(self.JWKS_URI)

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