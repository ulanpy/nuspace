"""Register aiogram middlewares (DB, Redis, i18n, infra clients)."""

import httpx
from aiogram import Dispatcher
from google.auth.credentials import Credentials
from google.cloud import storage
from redis.asyncio import Redis

from backend.core.configs.config import Config, config
from backend.core.database.manager import AsyncDatabaseManager

from .bucket_client import BucketClientMiddleware
from .db_session import DatabaseMiddleware
from .event_album import EventAlbumMiddleware
from .event_post import EventPostMiddleware
from .i18n import I18N
from .meilisearch import MeilisearchMiddleware
from .otinish import OtinishMiddleware
from .public_url import UrlMiddleware
from .redis import RedisMiddleware
from .telegram_link import TelegramLinkMiddleware


def setup_middlewares(
    dp: Dispatcher,
    url: str,
    redis: Redis,
    db_manager: AsyncDatabaseManager,
    storage_client: storage.Client,
    meilisearch_client: httpx.AsyncClient,
    *,
    broker,
    signing_credentials: Credentials | None = None,
    app_config: Config | None = None,
) -> None:
    """Attach shared dependencies to every update handler."""
    cfg = app_config or config
    middlewares = [
        DatabaseMiddleware(db_manager),
        RedisMiddleware(redis),
        UrlMiddleware(config.PUBLIC_WEBHOOK_URL),
        I18N(),
        TelegramLinkMiddleware(),
        OtinishMiddleware(),
        BucketClientMiddleware(storage_client),
        MeilisearchMiddleware(meilisearch_client),
        EventPostMiddleware(
            meilisearch_client=meilisearch_client,
            storage_client=storage_client,
            redis=redis,
            broker=broker,
            signing_credentials=signing_credentials,
            app_config=cfg,
        ),
    ]
    for middleware in middlewares:
        dp.update.middleware(middleware)
        dp.message.middleware(middleware)
        dp.callback_query.middleware(middleware)
        dp.chat_member.middleware(middleware)
    dp.message.middleware(EventAlbumMiddleware(redis))
