from __future__ import annotations

from google.auth.credentials import Credentials
from google.cloud import storage
from httpx import AsyncClient
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.configs.config import Config, config
from backend.modules.bot.services.deepseek_event_extractor import DeepSeekEventExtractor
from backend.modules.bot.services.event_post import EventPostService
from backend.modules.bot.services.event_publisher import EventServicePublisher


def build_event_post_service(
    *,
    db_session: AsyncSession,
    meilisearch_client: AsyncClient,
    storage_client: storage.Client,
    redis: Redis,
    broker,
    signing_credentials: Credentials | None = None,
    app_config: Config | None = None,
) -> EventPostService:
    """Wire EventDraftExtractor + CampusEventPublisher into EventPostService."""
    cfg = app_config or config
    extractor = DeepSeekEventExtractor(
        api_key=cfg.DEEPSEEK_API_KEY,
        base_url=cfg.DEEPSEEK_BASE_URL,
        model=cfg.DEEPSEEK_MODEL,
    )
    publisher = EventServicePublisher(
        db_session=db_session,
        meilisearch_client=meilisearch_client,
        storage_client=storage_client,
        redis=redis,
        broker=broker,
        signing_credentials=signing_credentials,
        app_config=cfg,
    )
    return EventPostService(
        db_session=db_session,
        draft_extractor=extractor,
        event_publisher=publisher,
    )
