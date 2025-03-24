from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

# Load environment variables from .env file
ENV_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
load_dotenv(os.path.join(ENV_DIR, ".env"))


class Config(BaseSettings):
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
    frontend_host: str = "http://localhost"
    nginx_port: int = 80
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str

    TG_API_KEY: str
    WEBAPP_HOST: str = "localhost"
    WEBAPP_PORT: int = 3001
    ngrok_server_endpoint: str
    url_webhook_endpoint: str = ""

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
# Usage
config = Config()
