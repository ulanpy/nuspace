from datetime import datetime
from typing import List, Tuple

from httpx import AsyncClient
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.utils import meilisearch
from backend.modules.auth.models import User
from backend.modules.campuscurrent.events import schemas, utils
from backend.modules.campuscurrent.models import (
    Event,
    EventAccessInvite,
    EventAccessPurpose,
    EventAttendee,
    EventAttendeeViewer,
)
from backend.modules.media.models import EntityType, Media, MediaFormat


class EventRepository:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def create_event(self, event_data: schemas.EnrichedEventCreateRequest) -> Event:
        event = Event(**event_data.model_dump())
        self.db_session.add(event)
        await self.db_session.flush()
        await self.db_session.refresh(event)
        return event

    async def update_event(self, event: Event, event_data: schemas.EventUpdateRequest) -> Event:
        for field, value in event_data.model_dump(
            exclude_unset=True, exclude={"media_ids_to_delete"}
        ).items():
            if hasattr(event, field):
                setattr(event, field, value)
        await self.db_session.flush()
        await self.db_session.refresh(event)
        return event

    async def upsert_search(self, meilisearch_client: AsyncClient, event: Event) -> None:
        await meilisearch.upsert(
            client=meilisearch_client,
            storage_name=Event.__tablename__,
            json_values={
                "id": event.id,
                "name": event.name,
                "description": event.description,
                "policy": event.policy.value if event.policy else None,
            },
        )

    async def delete_from_search(self, meilisearch_client: AsyncClient, event_id: int) -> None:
        await meilisearch.delete(
            client=meilisearch_client,
            storage_name=Event.__tablename__,
            primary_key=str(event_id),
        )

    async def delete_event_and_media(
        self, event: Event, media_objects: List[Media]
    ) -> Tuple[bool, bool]:
        try:
            await self.db_session.delete(event)
            for media in media_objects:
                await self.db_session.delete(media)
            return True, True
        except Exception:
            return False, False

    async def get_event_by_id(self, event_id: int) -> Event | None:
        stmt = select(Event).where(Event.id == event_id)
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def get_user_by_sub(self, sub: str) -> User | None:
        stmt = select(User).where(User.sub == sub)
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def list_creators_by_event_ids(self, event_ids: List[int]) -> dict[int, User]:
        """Join events → users for the given event ids. Keyed by event.id."""
        if not event_ids:
            return {}

        stmt = (
            select(Event.id, User)
            .join(User, User.sub == Event.creator_sub)
            .where(Event.id.in_(event_ids))
        )
        result = await self.db_session.execute(stmt)
        return {event_id: user for event_id, user in result.all()}

    async def list_events(
        self,
        event_filter: schemas.EventFilter,
        creator_sub: str | None,
        meilisearch_client: AsyncClient,
    ) -> Tuple[List[Event], int, bool]:
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
        if event_filter.keyword:
            filters.append(Event.id.in_(event_ids))
        if event_filter.event_type:
            filters.append(Event.type == event_filter.event_type)
        if event_filter.event_status:
            filters.append(Event.status == event_filter.event_status)
        if creator_sub:
            filters.append(Event.creator_sub == creator_sub)

        if event_filter.time_filter:
            filters.extend(
                utils.build_time_filter_expressions(time_filter=event_filter.time_filter)
            )
        else:
            # Compare campus calendar dates (Asia/Almaty), not UTC date of the instant.
            campus_start_date = func.date(func.timezone("Asia/Almaty", Event.start_datetime))
            if event_filter.start_date:
                filters.append(campus_start_date >= event_filter.start_date)
            if event_filter.end_date:
                filters.append(campus_start_date <= event_filter.end_date)

        stmt = select(Event).where(*filters).order_by(Event.start_datetime.asc())
        if not event_filter.keyword:
            page = max(1, event_filter.page or 1)
            stmt = stmt.offset((page - 1) * event_filter.size).limit(event_filter.size)

        result = await self.db_session.execute(stmt)
        events: List[Event] = list(result.scalars().all())

        if event_filter.keyword and meili_result is not None:
            count: int = meili_result.get("estimatedTotalHits", 0)
        else:
            count_stmt = select(func.count()).select_from(Event).where(*filters)
            count_result = await self.db_session.execute(count_stmt)
            count = count_result.scalar() or 0

        return events, count, keyword_no_results

    async def list_media(
        self,
        event_ids: List[int] | None = None,
        event_media_formats: List[MediaFormat] | None = None,
    ) -> List[Media]:
        if not event_ids:
            return []

        event_conditions = [
            Media.entity_id.in_(event_ids),
            Media.entity_type == EntityType.community_events,
        ]
        if event_media_formats:
            event_conditions.append(Media.media_format.in_(event_media_formats))

        stmt = select(Media).where(and_(*event_conditions))
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def get_attendee(self, event_id: int, user_sub: str) -> EventAttendee | None:
        stmt = select(EventAttendee).where(
            EventAttendee.event_id == event_id,
            EventAttendee.user_sub == user_sub,
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def add_attendee(self, event_id: int, user_sub: str) -> EventAttendee:
        existing = await self.get_attendee(event_id, user_sub)
        if existing is not None:
            return existing

        attendee = EventAttendee(event_id=event_id, user_sub=user_sub)
        self.db_session.add(attendee)
        await self.db_session.flush()
        return attendee

    async def remove_attendee(self, event_id: int, user_sub: str) -> bool:
        attendee = await self.get_attendee(event_id, user_sub)
        if attendee is None:
            return False
        await self.db_session.delete(attendee)
        await self.db_session.flush()
        return True

    async def count_attendees(self, event_id: int) -> int:
        stmt = (
            select(func.count())
            .select_from(EventAttendee)
            .where(EventAttendee.event_id == event_id)
        )
        result = await self.db_session.execute(stmt)
        return result.scalar() or 0

    async def count_attendees_by_event_ids(self, event_ids: List[int]) -> dict[int, int]:
        if not event_ids:
            return {}

        stmt = (
            select(EventAttendee.event_id, func.count())
            .where(EventAttendee.event_id.in_(event_ids))
            .group_by(EventAttendee.event_id)
        )
        result = await self.db_session.execute(stmt)
        return {event_id: count for event_id, count in result.all()}

    async def list_going_event_ids(self, event_ids: List[int], user_sub: str) -> set[int]:
        if not event_ids or not user_sub:
            return set()

        stmt = select(EventAttendee.event_id).where(
            EventAttendee.event_id.in_(event_ids),
            EventAttendee.user_sub == user_sub,
        )
        result = await self.db_session.execute(stmt)
        return set(result.scalars().all())

    async def list_attendees(
        self, event_id: int, *, page: int = 1, size: int = 20
    ) -> Tuple[List[tuple[User, datetime]], int]:
        filters = [EventAttendee.event_id == event_id]
        count_stmt = select(func.count()).select_from(EventAttendee).where(*filters)
        count_result = await self.db_session.execute(count_stmt)
        total = count_result.scalar() or 0

        page = max(1, page)
        size = max(1, min(size, 100))
        stmt = (
            select(User, EventAttendee.created_at)
            .join(EventAttendee, EventAttendee.user_sub == User.sub)
            .where(*filters)
            .order_by(EventAttendee.created_at.asc())
            .offset((page - 1) * size)
            .limit(size)
        )
        result = await self.db_session.execute(stmt)
        rows = [(row[0], row[1]) for row in result.all()]
        return rows, total

    async def list_all_attendees_for_export(self, event_id: int) -> List[tuple[User, datetime]]:
        stmt = (
            select(User, EventAttendee.created_at)
            .join(EventAttendee, EventAttendee.user_sub == User.sub)
            .where(EventAttendee.event_id == event_id)
            .order_by(EventAttendee.created_at.asc())
        )
        result = await self.db_session.execute(stmt)
        return [(row[0], row[1]) for row in result.all()]

    async def is_attendee_viewer(self, event_id: int, user_sub: str) -> bool:
        stmt = select(EventAttendeeViewer.user_sub).where(
            EventAttendeeViewer.event_id == event_id,
            EventAttendeeViewer.user_sub == user_sub,
        )
        result = await self.db_session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def list_attendee_viewer_event_ids(
        self, event_ids: List[int], user_sub: str
    ) -> set[int]:
        if not event_ids or not user_sub:
            return set()
        stmt = select(EventAttendeeViewer.event_id).where(
            EventAttendeeViewer.event_id.in_(event_ids),
            EventAttendeeViewer.user_sub == user_sub,
        )
        result = await self.db_session.execute(stmt)
        return set(result.scalars().all())

    async def add_attendee_viewer(
        self, event_id: int, user_sub: str, granted_by_sub: str
    ) -> EventAttendeeViewer:
        existing_stmt = select(EventAttendeeViewer).where(
            EventAttendeeViewer.event_id == event_id,
            EventAttendeeViewer.user_sub == user_sub,
        )
        existing = (await self.db_session.execute(existing_stmt)).scalars().first()
        if existing is not None:
            return existing

        viewer = EventAttendeeViewer(
            event_id=event_id,
            user_sub=user_sub,
            granted_by_sub=granted_by_sub,
        )
        self.db_session.add(viewer)
        await self.db_session.flush()
        return viewer

    async def create_access_invite(
        self,
        *,
        event_id: int,
        purpose: EventAccessPurpose,
        token_hash: str,
        created_by_sub: str,
        expires_at: datetime,
    ) -> EventAccessInvite:
        invite = EventAccessInvite(
            event_id=event_id,
            purpose=purpose,
            token_hash=token_hash,
            created_by_sub=created_by_sub,
            expires_at=expires_at,
        )
        self.db_session.add(invite)
        await self.db_session.flush()
        await self.db_session.refresh(invite)
        return invite

    async def get_access_invite_by_token_hash(
        self, token_hash: str
    ) -> EventAccessInvite | None:
        stmt = select(EventAccessInvite).where(EventAccessInvite.token_hash == token_hash)
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def list_access_invites(self, event_id: int) -> List[EventAccessInvite]:
        stmt = (
            select(EventAccessInvite)
            .where(EventAccessInvite.event_id == event_id)
            .order_by(EventAccessInvite.created_at.desc())
        )
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def get_access_invite(self, invite_id: int) -> EventAccessInvite | None:
        stmt = select(EventAccessInvite).where(EventAccessInvite.id == invite_id)
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def transfer_event_ownership(self, event: Event, new_owner_sub: str) -> Event:
        event.creator_sub = new_owner_sub
        await self.db_session.flush()
        return event
