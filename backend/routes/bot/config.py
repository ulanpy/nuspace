from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

load_dotenv()


class Config(BaseSettings):
    TG_API_KEY: str
    WEBAPP_HOST: str
    WEBAPP_PORT: int
    ngrok_server_endpoint: str
    url_webhook_endpoint: str


config = Config()