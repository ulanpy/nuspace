from aiogram import Dispatcher
from google.cloud import storage
from redis.asyncio import Redis
import httpx

from backend.core.database.manager import AsyncDatabaseManager
from backend.core.configs.config import config
from .bucket_client import BucketClientMiddleware
from .db_session import DatabaseMiddleware
from .i18n import I18N
from .meilisearch import MeilisearchMiddleware
from .public_url import UrlMiddleware
from .redis import RedisMiddleware


def setup_middlewares(
    dp: Dispatcher,
    url: str,
    redis: Redis,
    db_manager: AsyncDatabaseManager,
    storage_client: storage.Client,
    meilisearch_client: httpx.AsyncClient,
):
    middlewares = [
        DatabaseMiddleware(db_manager),
        RedisMiddleware(redis),
        UrlMiddleware(config.HOME_URL),
        I18N(),
        BucketClientMiddleware(storage_client),
        MeilisearchMiddleware(meilisearch_client),
    ]
    for middleware in middlewares:
        dp.update.middleware(middleware)
        dp.message.middleware(middleware)
        dp.callback_query.middleware(middleware)
        dp.chat_member.middleware(middleware)
