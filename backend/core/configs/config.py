import json
import os
from functools import cached_property
from typing import List

from dotenv import load_dotenv
from google.oauth2 import service_account
from pydantic_settings import BaseSettings

ENV_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
load_dotenv(os.path.join(ENV_DIR, ".env"))

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
    TG_API_KEY: str
    TG_WEBHOOK_SECRET_TOKEN: str
    CLOUDFLARED_TUNNEL_URL: str
    NUSPACE: str
    GCP_PROJECT_ID: str
    GCP_TOPIC_ID: str
    ORIGINS: List[str] = ["*"]
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
    def FRONTEND_HOST(self) -> str:
        return self.NUSPACE if not self.IS_DEBUG else "http://localhost"

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
        raw_url = self.NUSPACE if not self.IS_DEBUG else self.CLOUDFLARED_TUNNEL_URL
        return raw_url.split("https://", 1)[1]


config = Config()
