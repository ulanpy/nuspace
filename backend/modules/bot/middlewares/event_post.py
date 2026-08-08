from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject
from google.auth.credentials import Credentials
from google.cloud import storage
from httpx import AsyncClient
from redis.asyncio import Redis

from backend.core.configs.config import Config
from backend.modules.bot.dependencies import build_event_post_service


class EventPostMiddleware(BaseMiddleware):
    """Inject EventPostService (Gemini extractor + event publisher) into handlers."""

    def __init__(
        self,
        *,
        meilisearch_client: AsyncClient,
        storage_client: storage.Client,
        redis: Redis,
        broker,
        signing_credentials: Credentials | None = None,
        app_config: Config,
    ) -> None:
        self.meilisearch_client = meilisearch_client
        self.storage_client = storage_client
        self.redis = redis
        self.broker = broker
        self.signing_credentials = signing_credentials
        self.app_config = app_config

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        uow = data.get("uow")
        if uow is not None:
            data["event_post_service"] = build_event_post_service(
                uow=uow,
                meilisearch_client=self.meilisearch_client,
                storage_client=self.storage_client,
                redis=self.redis,
                broker=self.broker,
                signing_credentials=self.signing_credentials,
                app_config=self.app_config,
            )
        return await handler(event, data)
