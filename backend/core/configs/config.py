import os


from dotenv import load_dotenv
from pydantic import field_validator, Field
from pathlib import Path
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from pydantic_settings import BaseSettings


load_dotenv()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
session_middleware_key = 'your_secret_key'
db_name = os.getenv("DB_NAME")
db_user = os.getenv("DB_USER")
db_password = os.getenv("DB_PASSWORD")
db_host = os.getenv("DB_HOST", "postgres")
db_port = os.getenv("DB_PORT", "5432")
redis_host = os.getenv("REDIS_HOST", "localhost")
redis_port = os.getenv("REDIS_PORT", "6379")
DATABASE_URL = f"postgresql+asyncpg://{db_name}:{db_password}@{db_host}:{db_port}/{db_user}"
BUCKET_NAME = "nuspace_bucket"
jwt_key = os.getenv("JWT_KEY")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 2880


frontend_host = os.getenv("FRONTEND_HOST", "http://localhost")
nginx_port = os.getenv("NGINX_PORT", 80)

