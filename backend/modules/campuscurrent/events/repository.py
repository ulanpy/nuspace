from typing import List, Tuple

from httpx import AsyncClient
from sqlalchemy import and_, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.utils import meilisearch
from backend.core.database.models import Event
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.media import Media, MediaFormat
from backend.modules.campuscurrent.events import schemas, utils


class EventRepository:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def create_event(
        self, event_data: schemas.EnrichedEventCreateRequest
    ) -> Event:
        qb = QueryBuilder(session=self.db_session, model=Event)
        return await qb.add(
            data=event_data,
            preload=[Event.creator, Event.community, Event.collaborators],
        )

    async def update_event(
        self, event: Event, event_data: schemas.EventUpdateRequest
    ) -> Event:
        qb = QueryBuilder(session=self.db_session, model=Event)
        return await qb.update(
            instance=event,
            update_data=event_data,
            preload=[Event.creator, Event.community, Event.collaborators],
        )

    async def upsert_search(self, meilisearch_client: AsyncClient, event: Event) -> None:
        await meilisearch.upsert(
            client=meilisearch_client,
            storage_name=Event.__tablename__,
            json_values={
                "id": event.id,
                "name": event.name,
                "description": event.description,
                "community_id": event.community_id,
                "policy": event.policy.value if event.policy else None,
            },
        )

    async def delete_from_search(
        self, meilisearch_client: AsyncClient, event_id: int
    ) -> None:
        await meilisearch.delete(
            client=meilisearch_client,
            storage_name=Event.__tablename__,
            primary_key=str(event_id),
        )

    async def delete_event_and_media(
        self, event: Event, media_objects: List[Media]
    ) -> Tuple[bool, bool]:
        qb = QueryBuilder(session=self.db_session, model=Event)
        event_deleted: bool = await qb.blank(Event).delete(target=event)
        media_deleted: bool = await qb.blank(Media).delete(target=media_objects)
        return event_deleted, media_deleted

    async def get_event_by_id(self, event_id: int) -> Event | None:
        qb = QueryBuilder(session=self.db_session, model=Event)
        return (
            await qb.base()
            .filter(Event.id == event_id)
            .eager(Event.community, Event.creator, Event.collaborators)
            .first()
        )

    async def list_events(
        self,
        event_filter: schemas.EventFilter,
        creator_sub: str | None,
        meilisearch_client: AsyncClient,
    ) -> Tuple[List[Event], int, bool]:
        qb = QueryBuilder(session=self.db_session, model=Event)
        meili_result: dict | None = None
        keyword_no_results = False

        if event_filter.keyword:
            meili_result = await meilisearch.get(
                client=meilisearch_client,
                storage_name=EntityType.community_events.value,
                keyword=event_filter.keyword,
                page=event_filter.page,
                size=event_filter.size,
                filters=None,
            )
            event_ids: List[int] = [
                item["id"] for item in meili_result.get("hits", []) if "id" in item
            ]

            if not event_ids:
                estimated_hits = meili_result.get("estimatedTotalHits", 0) if meili_result else 0
                return [], estimated_hits, True

        filters = []
        if event_filter.registration_policy:
            filters.append(Event.policy == event_filter.registration_policy)
        if event_filter.community_id:
            filters.append(Event.community_id == event_filter.community_id)
        if event_filter.keyword:
            filters.append(Event.id.in_(event_ids))
        if event_filter.event_type:
            filters.append(Event.type == event_filter.event_type)
        if event_filter.event_status:
            filters.append(Event.status == event_filter.event_status)
        if event_filter.event_scope:
            filters.append(Event.scope == event_filter.event_scope)
        if creator_sub:
            filters.append(Event.creator_sub == creator_sub)

        if event_filter.time_filter:
            filters.extend(
                utils.build_time_filter_expressions(time_filter=event_filter.time_filter)
            )
        else:
            if event_filter.start_date:
                filters.append(func.date(Event.start_datetime) >= event_filter.start_date)
            if event_filter.end_date:
                filters.append(func.date(Event.start_datetime) <= event_filter.end_date)

        events: List[Event] = (
            await qb.base()
            .filter(*filters)
            .eager(Event.creator, Event.community, Event.collaborators)
            .paginate(
                event_filter.size if not event_filter.keyword else None,
                event_filter.page if not event_filter.keyword else None,
            )
            .order(Event.start_datetime.asc())
            .all()
        )

        if event_filter.keyword and meili_result is not None:
            count: int = meili_result.get("estimatedTotalHits", 0)
        else:
            count: int = (
                await qb.blank(model=Event).base(count=True).filter(*filters).count()
            )

        return events, count, keyword_no_results

    async def list_media(
        self,
        event_ids: List[int] | None = None,
        community_ids: List[int] | None = None,
        event_media_formats: List[MediaFormat] | None = None,
        community_media_formats: List[MediaFormat] | None = None,
    ) -> List[Media]:
        media_conditions = []
        if event_ids:
            event_conditions = [
                Media.entity_id.in_(event_ids),
                Media.entity_type == EntityType.community_events,
            ]
            if event_media_formats:
                event_conditions.append(Media.media_format.in_(event_media_formats))
            media_conditions.append(and_(*event_conditions))

        if community_ids:
            community_conditions = [
                Media.entity_id.in_(community_ids),
                Media.entity_type == EntityType.communities,
            ]
            if community_media_formats:
                community_conditions.append(Media.media_format.in_(community_media_formats))
            media_conditions.append(and_(*community_conditions))

        qb = QueryBuilder(session=self.db_session, model=Media)
        return (
            await qb.base().filter(or_(*media_conditions)).all() if media_conditions else []
        )
