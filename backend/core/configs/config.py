import json
import os
from functools import cached_property
from typing import List

from dotenv import load_dotenv
from google.oauth2 import service_account
from pydantic_settings import BaseSettings

ENV_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
load_dotenv(os.path.join(ENV_DIR, ".env"))

# should be in /nuspace/backend/core/configs/nuspace.json
CREDENTIALS_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "nuspace.json"))


class Config(BaseSettings):
    SESSION_MIDDLEWARE_KEY: str
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str
    DB_HOST: str
    DB_PORT: int
    REDIS_HOST: str
    REDIS_PORT: int
    BUCKET_NAME: str
    MEILISEARCH_MASTER_KEY: str
    MEILISEARCH_URL: str
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str
    IS_DEBUG: bool = True
    TELEGRAM_BOT_TOKEN: str
    TG_WEBHOOK_SECRET_TOKEN: str
    CLOUDFLARED_TUNNEL_URL: str
    NUSPACE: str
    GCP_PROJECT_ID: str
    GCP_TOPIC_ID: str
    PUSH_AUTH_SERVICE_ACCOUNT: str
    PUSH_AUTH_AUDIENCE: str
    ORIGINS: List[str] = ["*"]
    # Header mapping for easy reference when setting values
    GCS_METADATA_HEADERS: dict = {
        "filename": "x-goog-meta-filename",
        "media_table": "x-goog-meta-media-table",
        "entity_id": "x-goog-meta-entity-id",
        "media_format": "x-goog-meta-media-format",
        "media_order": "x-goog-meta-media-order",
        "mime_type": "x-goog-meta-mime-type",
        "content_type": "Content-Type",
    }
    APP_JWT_SECRET_256: str
    _COOKIE_ACCESS_NAME: str = "access_token"
    _COOKIE_REFRESH_NAME: str = "refresh_token"
    _COOKIE_APP_NAME: str = "app_token"
    APP_TOKEN_EXPIRY_MINUTES: int = 5

    class Config:
        env_file = os.path.join(ENV_DIR, ".env")
        env_file_encoding = "utf-8"
        extra = "allow"

    @cached_property
    def COOKIE_ACCESS_NAME(self) -> str:
        return self._COOKIE_ACCESS_NAME if not self.IS_DEBUG else "access_token"

    @cached_property
    def COOKIE_REFRESH_NAME(self) -> str:
        return self._COOKIE_REFRESH_NAME if not self.IS_DEBUG else "refresh_token"

    @cached_property
    def COOKIE_APP_NAME(self) -> str:
        return self._COOKIE_APP_NAME if not self.IS_DEBUG else "app_token"

    @cached_property
    def HOME_URL(self) -> str:
        return self.NUSPACE if not self.IS_DEBUG else self.CLOUDFLARED_TUNNEL_URL

    @cached_property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    @cached_property
    def REDIS_URL(self):
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}"

    @cached_property
    def BUCKET_CREDENTIALS(self):
        with open(CREDENTIALS_PATH, "r") as f:
            credentials_info = json.load(f)
        return service_account.Credentials.from_service_account_info(credentials_info)

    @cached_property
    def ROUTING_PREFIX(self) -> str:
        """
        Used to differentiate between different backend services.
        For example, if we have two backend services:
        - nuspace.kz (main service)
        - tunnel1.nuspace.kz (tunnel service)
        Then the routing prefix for the first service is nuspace.kz and for the second
        service is tunnel1.nuspace.kz.
        Use cases:
        - Used to generate blob filename for the media upload.
        - Used to validate if the GCS event belongs to the current backend service.
        """
        raw_url = self.NUSPACE if not self.IS_DEBUG else self.CLOUDFLARED_TUNNEL_URL
        return raw_url.split("https://", 1)[1]  # for example https://nuspace.kz -> nuspace.kz


config = Config()
