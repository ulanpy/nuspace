from aiogram import Dispatcher
from google.cloud import storage
from redis.asyncio import Redis

from backend.core.database.manager import AsyncDatabaseManager

from .bucket_client import BucketClientMiddleware
from .db_session import DatabaseMiddleware
from .i18n import I18N
from .public_url import UrlMiddleware
from .redis import RedisMiddleware


def setup_middlewares(
    dp: Dispatcher,
    url: str,
    redis: Redis,
    db_manager: AsyncDatabaseManager,
    storage_client: storage.Client,
):
    middlewares = [
        DatabaseMiddleware(db_manager),
        RedisMiddleware(redis),
        UrlMiddleware(url),
        I18N(),
        BucketClientMiddleware(storage_client),
    ]
    for middleware in middlewares:
        dp.update.middleware(middleware)
        dp.message.middleware(middleware)
        dp.callback_query.middleware(middleware)
        dp.chat_member.middleware(middleware)
