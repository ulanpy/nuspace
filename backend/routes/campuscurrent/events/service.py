from collections import defaultdict
from typing import List

from sqlalchemy import and_, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.schemas import Infra, MediaResponse
from backend.common.utils import meilisearch, response_builder
from backend.core.database.models import Event
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.media import Media, MediaFormat
from backend.routes.campuscurrent.events import schemas, utils
from backend.routes.campuscurrent.events.policy import EventPolicy
from backend.routes.google_bucket.utils import (
    batch_delete_blobs,
    generate_batch_download_urls,
)


class EventService:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def add_event(
        self,
        infra: Infra,
        event_data: schemas.EventCreateRequest,
        user: tuple[dict, dict],
    ) -> schemas.EventResponse:
        event_data: schemas.EnrichedEventCreateRequest = await utils.EventEnrichmentService(
            user=user
        ).enrich_event_data(event_data)

        qb = QueryBuilder(session=self.db_session, model=Event)
        event: Event = await qb.add(
            data=event_data,
            preload=[Event.creator, Event.community],
        )

        await meilisearch.upsert(
            client=infra.meilisearch_client,
            storage_name=Event.__tablename__,
            json_values={
                "id": event.id,
                "name": event.name,
                "description": event.description,
                "policy": event.policy.value if event.policy else None,
            },
        )

        media_objs: List[Media] = (
            await qb.blank(model=Media)
            .base()
            .filter(
                Media.entity_id == event.id,
                Media.entity_type == EntityType.community_events,
                Media.media_format == MediaFormat.carousel,
            )
            .all()
        )

        media_results = await response_builder.map_media_to_resources(
            infra=infra, media_objects=media_objs, resources=[event]
        )

        community_media_objs: List[Media] = (
            await qb.blank(model=Media)
            .base()
            .filter(
                Media.entity_id == event.community_id,
                Media.entity_type == EntityType.communities,
                Media.media_format.in_([MediaFormat.profile, MediaFormat.banner]),
            )
            .all()
        )

        community_media_results: List[List[MediaResponse]] = (
            await response_builder.map_media_to_resources(
                infra=infra, media_objects=community_media_objs, resources=[event.community]
            )
        )

        event = response_builder.build_schema(
            schemas.EventResponse,
            schemas.EventResponse.model_validate(event),
            creator=schemas.ShortUserResponse.model_validate(event.creator),
            media=media_results[0],
            community=(
                response_builder.build_schema(
                    schemas.ShortCommunityResponse,
                    schemas.ShortCommunityResponse.model_validate(event.community),
                    media=community_media_results[0] if community_media_results else [],
                )
                if event.community
                else None
            ),
            permissions=EventPolicy(user=user).get_permissions(event),
        )
        return event

    async def update_event(
        self,
        infra: Infra,
        event: Event,
        event_data: schemas.EventUpdateRequest,
        user: tuple[dict, dict],
    ) -> schemas.EventResponse:
        qb = QueryBuilder(session=self.db_session, model=Event)
        event: Event = await qb.update(
            instance=event,
            update_data=event_data,
            preload=[Event.creator, Event.community],
        )

        await meilisearch.upsert(
            client=infra.meilisearch_client,
            storage_name=Event.__tablename__,
            json_values={
                "id": event.id,
                "name": event.name,
                "description": event.description,
                "community_id": event.community_id,
                "policy": event.policy.value if event.policy else None,
            },
        )

        media_objs: List[Media] = (
            await qb.blank(model=Media)
            .base()
            .filter(
                Media.entity_id == event.id,
                Media.entity_type == EntityType.community_events,
                Media.media_format == MediaFormat.carousel,
            )
            .all()
        )

        media_results: List[List[MediaResponse]] = await response_builder.map_media_to_resources(
            infra=infra, media_objects=media_objs, resources=[event]
        )

        community_media_objs: List[Media] = (
            await qb.blank(model=Media)
            .base()
            .filter(
                Media.entity_id == event.community_id,
                Media.entity_type == EntityType.communities,
                Media.media_format.in_([MediaFormat.profile, MediaFormat.banner]),
            )
            .all()
        )

        community_media_results: List[List[MediaResponse]] = (
            await response_builder.map_media_to_resources(
                infra=infra, media_objects=community_media_objs, resources=[event.community]
            )
        )

        event = response_builder.build_schema(
            schemas.EventResponse,
            schemas.EventResponse.model_validate(event),
            creator=schemas.ShortUserResponse.model_validate(event.creator),
            media=media_results[0],
            community=(
                response_builder.build_schema(
                    schemas.ShortCommunityResponse,
                    schemas.ShortCommunityResponse.model_validate(event.community),
                    media=community_media_results[0] if community_media_results else [],
                )
                if event.community
                else None
            ),
            permissions=EventPolicy(user=user).get_permissions(event),
        )
        return event

    async def delete_event(self, infra: Infra, event: Event, event_id: int) -> bool:
        media_conditions = [
            Media.entity_id == event.id,
            Media.entity_type == EntityType.community_events,
        ]

        qb = QueryBuilder(session=self.db_session, model=Media)
        media_objects: List[Media] = await qb.base().filter(*media_conditions).all()

        await batch_delete_blobs(infra.storage_client, infra.config, media_objects)

        event_deleted: bool = await qb.blank(Event).delete(target=event)
        media_deleted: bool = await qb.blank(Media).delete(target=media_objects)

        if not event_deleted or not media_deleted:
            return False

        await meilisearch.delete(
            client=infra.meilisearch_client,
            storage_name=Event.__tablename__,
            primary_key=str(event_id),
        )
        return True

    async def get_event_by_id(
        self, infra: Infra, event_id: int, user: tuple[dict, dict]
    ) -> schemas.EventResponse | None:
        qb = QueryBuilder(session=self.db_session, model=Event)
        event: Event | None = (
            await qb.base()
            .filter(Event.id == event_id)
            .eager(Event.community, Event.creator)
            .first()
        )

        if event is None:
            return None

        media_objs: List[Media] = (
            await qb.blank(model=Media)
            .base()
            .filter(
                Media.entity_id == event.id,
                Media.entity_type == EntityType.community_events,
                Media.media_format == MediaFormat.carousel,
            )
            .all()
        )

        media_results: List[List[MediaResponse]] = await response_builder.map_media_to_resources(
            infra=infra, media_objects=media_objs, resources=[event]
        )

        community_media_objs: List[Media] = (
            await qb.blank(model=Media)
            .base()
            .filter(
                Media.entity_id == event.community_id,
                Media.entity_type == EntityType.communities,
                Media.media_format.in_([MediaFormat.profile, MediaFormat.banner]),
            )
            .all()
        )

        community_media_results: List[List[MediaResponse]] = (
            await response_builder.map_media_to_resources(
                infra=infra, media_objects=community_media_objs, resources=[event.community]
            )
        )

        event = response_builder.build_schema(
            schemas.EventResponse,
            schemas.EventResponse.model_validate(event),
            creator=schemas.ShortUserResponse.model_validate(event.creator),
            media=media_results[0],
            community=(
                response_builder.build_schema(
                    schemas.ShortCommunityResponse,
                    schemas.ShortCommunityResponse.model_validate(event.community),
                    media=community_media_results[0] if community_media_results else [],
                )
                if event.community
                else None
            ),
            permissions=EventPolicy(user=user).get_permissions(event),
        )
        return event

    async def get_events(
        self, user: tuple[dict, dict], event_filter: schemas.EventFilter, infra: Infra
    ) -> schemas.ListEventResponse:
        creator_sub = (
            user[0].get("sub") if event_filter.creator_sub == "me" else event_filter.creator_sub
        )

        if event_filter.keyword:
            meili_result: dict = await meilisearch.get(
                client=infra.meilisearch_client,
                storage_name=EntityType.community_events.value,
                keyword=event_filter.keyword,
                page=event_filter.page,
                size=event_filter.size,
                filters=None,
            )
            event_ids: List[int] = [item["id"] for item in meili_result["hits"]]

            if not event_ids:
                return schemas.ListEventResponse(events=[], total_pages=1)

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

        qb = QueryBuilder(session=self.db_session, model=Event)

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

        event_ids: List[int] = [event.id for event in events]
        community_ids: List[int] = [event.community_id for event in events if event.community_id]

        media_conditions = []
        if event_ids:
            media_conditions.append(
                and_(
                    Media.entity_id.in_(event_ids),
                    Media.entity_type == EntityType.community_events,
                    Media.media_format == MediaFormat.carousel,
                )
            )
        if community_ids:
            media_conditions.append(
                and_(
                    Media.entity_id.in_(community_ids),
                    Media.entity_type == EntityType.communities,
                    Media.media_format.in_([MediaFormat.profile, MediaFormat.banner]),
                )
            )

        if media_conditions:
            all_media_objs: List[Media] = (
                await qb.blank(model=Media).base().filter(or_(*media_conditions)).all()
            )
        else:
            all_media_objs: List[Media] = []

        event_media_objs: List[Media] = [
            media
            for media in all_media_objs
            if media.entity_type == EntityType.community_events and media.entity_id in event_ids
        ]
        community_media_objs: List[Media] = [
            media
            for media in all_media_objs
            if media.entity_type == EntityType.communities and media.entity_id in community_ids
        ]

        if all_media_objs:
            all_filenames: List[str] = [media.name for media in all_media_objs]
            all_url_data = await generate_batch_download_urls(
                infra.storage_client, infra.config, infra.signing_credentials, all_filenames
            )
            media_to_url = {
                media: url_data["signed_url"]
                for media, url_data in zip(all_media_objs, all_url_data)
            }
        else:
            media_to_url = {}

        event_media_by_id = defaultdict(list)
        for media in event_media_objs:
            event_media_by_id[media.entity_id].append(media)

        community_media_by_id = defaultdict(list)
        for media in community_media_objs:
            community_media_by_id[media.entity_id].append(media)

        if event_filter.keyword:
            count = meili_result.get("estimatedTotalHits", 0)
        else:
            count: int = await qb.blank(model=Event).base(count=True).filter(*filters).count()

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
                    collaborators=event.collaborators,
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

        total_pages: int = response_builder.calculate_pages(count=count, size=event_filter.size)
        return schemas.ListEventResponse(events=event_responses, total_pages=total_pages)
