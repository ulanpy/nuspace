from collections import defaultdict
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.schemas import Infra, MediaResponse
from backend.common.utils import response_builder
from backend.core.database.models import Event
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.media import Media, MediaFormat
from backend.modules.campuscurrent.events import schemas, utils
from backend.modules.campuscurrent.events.policy import EventPolicy
from backend.modules.campuscurrent.events.repository import EventRepository
from backend.modules.google_bucket.utils import (
    batch_delete_blobs,
    generate_batch_download_urls,
)


class EventService:
    def __init__(self, db_session: AsyncSession, repo: EventRepository | None = None):
        self.db_session = db_session
        self.repo = repo or EventRepository(db_session)

    async def add_event(
        self,
        infra: Infra,
        event_data: schemas.EventCreateRequest,
        user: tuple[dict, dict],
    ) -> schemas.EventResponse:
        event_data: schemas.EnrichedEventCreateRequest = await utils.EventEnrichmentService(
            user=user
        ).enrich_event_data(event_data)

        event: Event = await self.repo.create_event(event_data)
        await self.repo.upsert_search(infra.meilisearch_client, event)

        event_responses = await self._build_event_responses([event], infra, user)
        return event_responses[0]

    async def update_event(
        self,
        infra: Infra,
        event: Event,
        event_data: schemas.EventUpdateRequest,
        user: tuple[dict, dict],
    ) -> schemas.EventResponse:
        event: Event = await self.repo.update_event(event=event, event_data=event_data)
        await self.repo.upsert_search(infra.meilisearch_client, event)

        event_responses = await self._build_event_responses([event], infra, user)
        return event_responses[0]

    async def delete_event(self, infra: Infra, event: Event, event_id: int) -> bool:
        media_objects: List[Media] = await self.repo.list_media(event_ids=[event.id])
        await batch_delete_blobs(infra.storage_client, infra.config, media_objects)

        event_deleted, media_deleted = await self.repo.delete_event_and_media(
            event=event, media_objects=media_objects
        )

        if not event_deleted or not media_deleted:
            return False

        await self.repo.delete_from_search(
            meilisearch_client=infra.meilisearch_client, event_id=event_id
        )
        return True

    async def _build_event_responses(
        self,
        events: List[Event],
        infra: Infra,
        user: tuple[dict, dict],
    ) -> List[schemas.EventResponse]:
        if not events:
            return []

        event_ids: List[int] = [event.id for event in events]
        community_ids: List[int] = [
            event.community_id for event in events if event.community_id
        ]

        all_media_objs: List[Media] = await self.repo.list_media(
            event_ids=event_ids,
            community_ids=community_ids,
            event_media_formats=[MediaFormat.carousel],
            community_media_formats=[MediaFormat.profile, MediaFormat.banner],
        )

        media_to_url = {}
        if all_media_objs:
            all_filenames: List[str] = [media.name for media in all_media_objs]
            all_url_data = await generate_batch_download_urls(
                infra.storage_client, infra.config, infra.signing_credentials, all_filenames
            )
            media_to_url = {
                media: url_data["signed_url"]
                for media, url_data in zip(all_media_objs, all_url_data)
            }

        event_media_by_id = defaultdict(list)
        community_media_by_id = defaultdict(list)
        for media in all_media_objs:
            if media.entity_type == EntityType.community_events:
                event_media_by_id[media.entity_id].append(media)
            elif media.entity_type == EntityType.communities:
                community_media_by_id[media.entity_id].append(media)

        event_responses: List[schemas.EventResponse] = []
        for event in events:
            event_media_objects: List[Media] = event_media_by_id.get(event.id, [])
            event_media_responses: List[MediaResponse] = [
                MediaResponse(
                    id=media.id,
                    url=media_to_url.get(media, ""),
                    mime_type=media.mime_type,
                    entity_type=media.entity_type,
                    entity_id=media.entity_id,
                    media_format=media.media_format,
                    media_order=media.media_order,
                )
                for media in event_media_objects
            ]

            community_media_objects: List[Media] = (
                community_media_by_id.get(event.community_id, []) if event.community_id else []
            )
            community_media_responses = [
                MediaResponse(
                    id=media.id,
                    url=media_to_url.get(media, ""),
                    mime_type=media.mime_type,
                    entity_type=media.entity_type,
                    entity_id=media.entity_id,
                    media_format=media.media_format,
                    media_order=media.media_order,
                )
                for media in community_media_objects
            ]

            event_responses.append(
                response_builder.build_schema(
                    schemas.EventResponse,
                    schemas.EventResponse.model_validate(event),
                    media=event_media_responses,
                    collaborators=getattr(event, "collaborators", []),
                    community=(
                        response_builder.build_schema(
                            schemas.ShortCommunityResponse,
                            schemas.ShortCommunityResponse.model_validate(event.community),
                            media=community_media_responses,
                        )
                        if event.community
                        else None
                    ),
                    creator=schemas.ShortUserResponse.model_validate(event.creator),
                    permissions=EventPolicy(user=user).get_permissions(event),
                )
            )
        return event_responses

    async def get_event_by_id(
        self, infra: Infra, event_id: int, user: tuple[dict, dict]
    ) -> schemas.EventResponse | None:
        event: Event | None = await self.repo.get_event_by_id(event_id)
        if event is None:
            return None

        event_responses = await self._build_event_responses([event], infra, user)
        return event_responses[0] if event_responses else None

    async def get_events(
        self, user: tuple[dict, dict], event_filter: schemas.EventFilter, infra: Infra
    ) -> schemas.ListEventResponse:
        creator_sub = (
            user[0].get("sub") if event_filter.creator_sub == "me" else event_filter.creator_sub
        )

        events, count, keyword_no_results = await self.repo.list_events(
            event_filter=event_filter,
            creator_sub=creator_sub,
            meilisearch_client=infra.meilisearch_client,
        )

        if keyword_no_results:
            return schemas.ListEventResponse(
                items=[],
                total_pages=1,
                total=0,
                page=event_filter.page,
                size=event_filter.size,
                has_next=False,
            )

        event_responses: List[schemas.EventResponse] = await self._build_event_responses(
            events, infra, user
        )

        total_pages: int = response_builder.calculate_pages(count=count, size=event_filter.size)
        page = event_filter.page
        size = event_filter.size
        has_next = page < total_pages

        return schemas.ListEventResponse(
            items=event_responses,
            total_pages=total_pages,
            total=count,
            page=page,
            size=size,
            has_next=has_next,
        )
