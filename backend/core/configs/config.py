import json
import os
from typing import List

from dotenv import load_dotenv
from google.oauth2 import service_account
from pydantic_settings import BaseSettings

# Load environment variables from .env file
ENV_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
load_dotenv(os.path.join(ENV_DIR, ".env"))

CREDENTIALS_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "nuspace.json"))

class Config(BaseSettings):
    SESSION_MIDDLEWARE_KEY: setattr
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str
    DB_HOST: str 
    DB_PORT: int 
    REDIS_HOST: str 
    REDIS_PORT: int 
    BUCKET_NAME: str = "nuspace_bucket"
    IS_BOT_DEV: bool = False
    FRONTEND_HOST: str
    NGINX_PORT: int = 80
    MEILISEARCH_MASTER_KEY: str
    MEILISEARCH_URL: str
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str
    IS_DEBUG: bool = True
    TG_API_KEY: str
    SECRET_TOKEN: str
    CLOUDFLARED_TUNNEL_URL: str  # Maps to http://localhost:80 (e.g. Nginx container)
    NUSPACE: str
    GCP_PROJECT_ID: str
    GCP_TOPIC_ID: str
    ORIGINS: List[str] = ["*"]

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    @property
    def DATABASE_URL_SYNC(self) -> str:
        return f"postgresql+psycopg2://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    class Config:
        env_file = os.path.join(ENV_DIR, ".env")
        env_file_encoding = "utf-8"
        extra = "allow"

    @property
    def REDIS_URL(self):
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}"

    @property
    def BUCKET_CREDENTIALS(self):
        with open(CREDENTIALS_PATH, 'r') as f:
            credentials_info = json.load(f)
        return service_account.Credentials.from_service_account_info(
            credentials_info
        )

    @property
    def ROUTING_PREFIX(self) -> str:
        raw_url = self.NUSPACE if not self.IS_DEBUG else self.CLOUDFLARED_TUNNEL_URL
        return raw_url.split("https://", 1)[1]


# Usage
config = Config()
