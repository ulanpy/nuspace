from collections import defaultdict
from typing import List

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.schemas import Infra
from backend.common.utils import response_builder
from backend.modules.campuscurrent.events import schemas, utils
from backend.modules.campuscurrent.events.interfaces import MediaAttachmentResolver
from backend.modules.campuscurrent.events.policy import EventPolicy
from backend.modules.campuscurrent.events.repository import EventRepository
from backend.modules.campuscurrent.models import Event
from backend.modules.media.models import EntityType, Media, MediaFormat


class EventService:
    def __init__(
        self,
        db_session: AsyncSession,
        media_attachment_resolver: MediaAttachmentResolver,
        repo: EventRepository | None = None,
    ):
        self.db_session = db_session
        self.media_attachment_resolver = media_attachment_resolver
        self.repo = repo or EventRepository(db_session)

    async def _get_event_or_404(self, event_id: int) -> Event:
        event = await self.repo.get_event_by_id(event_id)
        if event is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
        return event

    async def _ensure_user_exists(self, sub: str) -> None:
        if await self.repo.get_user_by_sub(sub) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    async def add_event(
        self,
        infra: Infra,
        event_data: schemas.EventCreateRequest,
        user: tuple[dict, dict],
    ) -> schemas.EventResponse:
        EventPolicy(user=user).check_create(event_data)

        creator_sub = (
            user[0].get("sub") if event_data.creator_sub == "me" else event_data.creator_sub
        )
        await self._ensure_user_exists(creator_sub)

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
        event_id: int,
        event_data: schemas.EventUpdateRequest,
        user: tuple[dict, dict],
    ) -> schemas.EventResponse:
        event = await self._get_event_or_404(event_id)
        EventPolicy(user=user).check_update(event=event, event_data=event_data)

        media_ids_to_delete = event_data.media_ids_to_delete or []
        event: Event = await self.repo.update_event(event=event, event_data=event_data)
        await self.repo.upsert_search(infra.meilisearch_client, event)

        if media_ids_to_delete:
            await self._delete_event_media(infra, event, media_ids_to_delete)

        event_responses = await self._build_event_responses([event], infra, user)
        return event_responses[0]

    async def _delete_event_media(
        self,
        infra: Infra,
        event: Event,
        media_ids: List[int],
    ) -> None:
        media_objects = await self.media_attachment_resolver.list_by_ids(media_ids)

        found_ids = {media.id for media in media_objects}
        missing = set(media_ids) - found_ids
        if missing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Media not found: {sorted(missing)}",
            )

        for media in media_objects:
            if (
                media.entity_type != EntityType.community_events
                or media.entity_id != event.id
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Media does not belong to this event",
                )

        await self.media_attachment_resolver.delete_many(media_objects)

    async def delete_event(
        self, infra: Infra, event_id: int, user: tuple[dict, dict]
    ) -> None:
        event = await self._get_event_or_404(event_id)
        EventPolicy(user=user).check_delete(event=event)

        media_objects: List[Media] = await self.repo.list_media(event_ids=[event.id])
        await self.media_attachment_resolver.delete_many(media_objects)

        event_deleted, _ = await self.repo.delete_event_and_media(
            event=event, media_objects=[]
        )
        if not event_deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

        await self.repo.delete_from_search(
            meilisearch_client=infra.meilisearch_client, event_id=event_id
        )

    async def _build_event_responses(
        self,
        events: List[Event],
        infra: Infra,
        user: tuple[dict, dict],
    ) -> List[schemas.EventResponse]:
        if not events:
            return []

        event_ids: List[int] = [event.id for event in events]
        all_media_objs: List[Media] = await self.repo.list_media(
            event_ids=event_ids,
            event_media_formats=[MediaFormat.carousel],
        )

        url_map = await self.media_attachment_resolver.build_url_map(all_media_objs)

        event_media_by_id = defaultdict(list)
        for media in all_media_objs:
            if media.entity_type == EntityType.community_events:
                event_media_by_id[media.entity_id].append(media)

        event_responses: List[schemas.EventResponse] = []
        for event in events:
            event_media_objects: List[Media] = event_media_by_id.get(event.id, [])
            event_media_responses = self.media_attachment_resolver.to_responses(
                event_media_objects, url_map
            )

            event_responses.append(
                response_builder.build_schema(
                    schemas.EventResponse,
                    schemas.EventResponse.model_validate(event),
                    media=event_media_responses,
                    creator=schemas.ShortUserResponse.model_validate(event.creator),
                    permissions=EventPolicy(user=user).get_permissions(event),
                )
            )
        return event_responses

    async def get_event_by_id(
        self, infra: Infra, event_id: int, user: tuple[dict, dict]
    ) -> schemas.EventResponse:
        event = await self._get_event_or_404(event_id)
        EventPolicy(user=user).check_read_one(event=event)

        event_responses = await self._build_event_responses([event], infra, user)
        return event_responses[0]

    async def get_events(
        self, user: tuple[dict, dict], event_filter: schemas.EventFilter, infra: Infra
    ) -> schemas.ListEventResponse:
        EventPolicy(user=user).check_read_list(
            creator_sub=event_filter.creator_sub,
            event_status=event_filter.event_status,
        )

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
