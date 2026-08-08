from __future__ import annotations

from google.auth.credentials import Credentials
from google.cloud import storage
from httpx import AsyncClient
from redis.asyncio import Redis
from backend.core.database.uow import UnitOfWork

from backend.core.configs.config import Config, config
from backend.modules.bot.services.gemini_event_extractor import GeminiEventExtractor
from backend.modules.bot.services.event_post import EventPostService
from backend.modules.bot.services.event_publisher import EventServicePublisher


def build_event_post_service(
    *,
    uow: UnitOfWork,
    meilisearch_client: AsyncClient,
    storage_client: storage.Client,
    redis: Redis,
    broker,
    signing_credentials: Credentials | None = None,
    app_config: Config | None = None,
) -> EventPostService:
    """Wire Gemini extractor + CampusEventPublisher into EventPostService."""
    cfg = app_config or config
    extractor = GeminiEventExtractor(app_config=cfg)
    publisher = EventServicePublisher(
        uow=uow,
        meilisearch_client=meilisearch_client,
        storage_client=storage_client,
        redis=redis,
        broker=broker,
        signing_credentials=signing_credentials,
        app_config=cfg,
    )
    return EventPostService(
        uow=uow,
        draft_extractor=extractor,
        event_publisher=publisher,
    )
