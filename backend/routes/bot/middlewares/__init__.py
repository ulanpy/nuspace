from aiogram import Dispatcher

from .db_session import DatabaseMiddleware
from .redis import RedisMiddleware
from .public_url import UrlMiddleware
from .i18n import I18N
from .bucket_client import BucketClientMiddleware

from backend.core.database.manager import AsyncDatabaseManager
from redis.asyncio import Redis
from google.cloud import storage


def setup_middlewares(dp: Dispatcher,
                      url: str,
                      redis: Redis,
                      db_manager: AsyncDatabaseManager,
                      storage_client: storage.Client):
    middlewares = [DatabaseMiddleware(db_manager),
                   RedisMiddleware(redis),
                   UrlMiddleware(url),
                   I18N(),
                   BucketClientMiddleware(storage_client)]
    for middleware in middlewares:
        dp.update.middleware(middleware)
        dp.message.middleware(middleware)
        dp.callback_query.middleware(middleware)
        dp.chat_member.middleware(middleware)