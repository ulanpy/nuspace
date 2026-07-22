from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone

from google.auth.credentials import Credentials
from google.cloud import storage
from httpx import AsyncClient
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.schemas import Infra
from backend.core.configs.config import Config, config
from backend.modules.media.models import EntityType
from backend.modules.campuscurrent.models.events import EventType, RegistrationPolicy
from backend.modules.media.models import MediaFormat
from backend.modules.campuscurrent.events import schemas as event_schemas
from backend.modules.campuscurrent.events.service import EventService
from backend.modules.media.dependencies import build_media_service
from backend.modules.media.schemas import MediaUpsertData
from backend.modules.media.service import MediaService

logger = logging.getLogger(__name__)


class EventServicePublisher:
    """Adapter: CampusEventPublisher → EventService.add_event."""

    def __init__(
        self,
        *,
        db_session: AsyncSession,
        meilisearch_client: AsyncClient,
        storage_client: storage.Client,
        redis: Redis,
        broker,
        signing_credentials: Credentials | None = None,
        app_config: Config | None = None,
    ) -> None:
        self.db_session = db_session
        self.storage_client = storage_client
        self.infra = Infra(
            meilisearch_client=meilisearch_client,
            storage_client=storage_client,
            config=app_config or config,
            signing_credentials=signing_credentials,
            redis=redis,
            broker=broker,
        )
        self.media_service: MediaService = build_media_service(db_session, self.infra)
        self.event_service = EventService(
            db_session=db_session,
            media_attachment_resolver=self.media_service,
        )

    async def publish_personal_event(
        self,
        *,
        creator_sub: str,
        name: str,
        place: str,
        start_datetime: datetime,
        end_datetime: datetime,
        description: str,
        event_type: EventType,
        policy: RegistrationPolicy,
        registration_link: str | None = None,
        image_bytes: bytes | None = None,
        image_mime_type: str | None = None,
    ) -> int:
        user = (
            {"sub": creator_sub},
            {"role": "default", "communities": []},
        )
        created = await self.event_service.add_event(
            infra=self.infra,
            event_data=event_schemas.EventCreateRequest(
                creator_sub=creator_sub,
                name=name,
                place=place,
                start_datetime=start_datetime,
                end_datetime=end_datetime,
                description=description,
                type=event_type,
                policy=policy,
                registration_link=registration_link,
            ),
            user=user,
        )
        if image_bytes:
            try:
                await self._attach_carousel_image(
                    creator_sub=creator_sub,
                    event_id=created.id,
                    image_bytes=image_bytes,
                    mime_type=image_mime_type or "image/jpeg",
                )
            except Exception:
                logger.exception(
                    "Failed to attach Telegram image to event_id=%s", created.id
                )
        return created.id

    async def _attach_carousel_image(
        self,
        *,
        creator_sub: str,
        event_id: int,
        image_bytes: bytes,
        mime_type: str,
    ) -> None:
        cfg = self.infra.config
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
        filename = f"{cfg.ROUTING_PREFIX}/{creator_sub}_{timestamp}_{uuid.uuid4().hex}"
        bucket = self.storage_client.bucket(cfg.BUCKET_NAME)
        blob = bucket.blob(filename)
        blob.metadata = {
            "filename": filename,
            "media-table": EntityType.community_events.value,
            "entity-id": str(event_id),
            "media-format": MediaFormat.carousel.value,
            "media-order": "0",
            "mime-type": mime_type,
        }

        await asyncio.to_thread(
            blob.upload_from_string,
            image_bytes,
            content_type=mime_type,
        )
        await self.media_service.upsert(
            MediaUpsertData(
                name=filename,
                mime_type=mime_type,
                entity_type=EntityType.community_events,
                entity_id=event_id,
                media_format=MediaFormat.carousel,
                media_order=0,
            )
        )
