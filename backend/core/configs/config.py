from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os
from google.oauth2 import service_account
import json


# Load environment variables from .env file
ENV_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
load_dotenv(os.path.join(ENV_DIR, ".env"))


class Config(BaseSettings):
    GCP_CREDENTIALS_JSON: str
    session_middleware_key: str = "your_secret_key"
    db_name: str
    db_user: str
    db_password: str
    db_host: str = "postgres"
    db_port: int = 5432
    redis_host: str = "redis"
    redis_port: int = 6379
    bucket_name: str = "nuspace_bucket"
    IS_BOT_DEV: bool = False
    FRONTEND_HOST: str
    nginx_port: int = 80
    meilisearch_url: str 
    meilisearch_master_key: str
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str
    IS_DEBUG: bool = True
    TG_API_KEY: str
    SECRET_TOKEN: str
    CLOUDFLARED_TUNNEL_URL: str  # Maps to http://localhost:80 (e.g. Nginx container)
    NUSPACE: str
    GCP_PROJECT_ID: str
    GCP_TOPIC_ID: str


    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    @property
    def DATABASE_URL_SYNC(self) -> str:
        return f"postgresql+psycopg2://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"
    class Config:
        env_file = os.path.join(ENV_DIR, ".env")
        env_file_encoding = "utf-8"
        extra = "allow"

    @property
    def REDIS_URL(self):
        return f"redis://{self.redis_host}:{self.redis_port}"

    @property
    def BUCKET_CREDENTIALS(self):
         return service_account.Credentials.from_service_account_info(json.loads(self.GCP_CREDENTIALS_JSON))

    @property
    def ROUTING_PREFIX(self) -> str:
        raw_url = self.NUSPACE if not self.IS_DEBUG else self.CLOUDFLARED_TUNNEL_URL
        return raw_url.split("https://", 1)[1]
# Usage
config = Config()
