from dataclasses import dataclass, field
from datetime import datetime
from functools import lru_cache
from typing import List, Tuple

from httpx import AsyncClient
from sqlalchemy import and_, bindparam, case, func, literal, select
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
    EventType,
)
from backend.modules.media.models import EntityType, Media, MediaFormat


@dataclass
class EventListScreenRow:
    """All data needed to render one event card on the events screen."""

    event: Event
    creator: User
    media: list[Media] = field(default_factory=list)
    attendees_count: int = 0
    is_going: bool = False
    is_attendee_viewer: bool = False


@dataclass(frozen=True)
class _EventScreenQueryShape:
    """Structural parts of an events-screen query which are safe to reuse."""

    has_registration_policy: bool
    has_event_ids: bool
    has_event_type: bool
    has_event_status: bool
    has_creator_sub: bool
    has_start_date: bool
    has_end_date: bool
    has_viewer: bool
    is_keyword_search: bool
    sort_by_display_datetime: bool


def _build_event_screen_statement(
    filters: list,
    *,
    viewer_sub: str | None | object,
    offset: int | object | None,
    limit: int | object | None,
    sort_by_display_datetime: bool = False,
):
    """Build the shared one-round-trip statement from already-shaped filters."""
    sort_datetime = (
        case(
            (Event.type == EventType.recruitment, Event.end_datetime),
            else_=Event.start_datetime,
        )
        if sort_by_display_datetime
        else Event.start_datetime
    )
    page_query = (
        select(Event, func.count().over().label("total"))
        .where(*filters)
        .order_by(sort_datetime.asc())
    )
    if offset is not None and limit is not None:
        page_query = page_query.offset(offset).limit(limit)
    page_cte = page_query.cte("event_page")

    attendee_counts = (
        select(
            EventAttendee.event_id.label("event_id"),
            func.count().label("attendees_count"),
        )
        .join(page_cte, page_cte.c.id == EventAttendee.event_id)
        .group_by(EventAttendee.event_id)
        .cte("attendee_counts")
    )

    going_events = None
    viewer_events = None
    if viewer_sub is not None:
        going_events = (
            select(EventAttendee.event_id.label("event_id"))
            .join(page_cte, page_cte.c.id == EventAttendee.event_id)
            .where(EventAttendee.user_sub == viewer_sub)
            .cte("going_events")
        )
        viewer_events = (
            select(EventAttendeeViewer.event_id.label("event_id"))
            .join(page_cte, page_cte.c.id == EventAttendeeViewer.event_id)
            .where(EventAttendeeViewer.user_sub == viewer_sub)
            .cte("viewer_events")
        )

    stmt = (
        select(
            Event,
            User,
            Media,
            page_cte.c.total,
            func.coalesce(attendee_counts.c.attendees_count, 0).label("attendees_count"),
            (
                going_events.c.event_id.is_not(None) if going_events is not None else literal(False)
            ).label("is_going"),
            (
                viewer_events.c.event_id.is_not(None)
                if viewer_events is not None
                else literal(False)
            ).label("is_attendee_viewer"),
        )
        .select_from(page_cte)
        .join(Event, Event.id == page_cte.c.id)
        .join(User, User.sub == Event.creator_sub)
        .outerjoin(
            Media,
            and_(
                Media.entity_id == Event.id,
                Media.entity_type == EntityType.community_events,
                Media.media_format == MediaFormat.carousel,
            ),
        )
        .outerjoin(attendee_counts, attendee_counts.c.event_id == Event.id)
    )
    if going_events is not None and viewer_events is not None:
        stmt = stmt.outerjoin(going_events, going_events.c.event_id == Event.id).outerjoin(
            viewer_events, viewer_events.c.event_id == Event.id
        )
    return stmt.order_by(sort_datetime.asc(), Media.media_order.asc(), Media.id.asc())


@lru_cache(maxsize=128)
def _cached_event_screen_statement(shape: _EventScreenQueryShape):
    """Return a parameterized statement template for a stable filter shape.

    SQLAlchemy statements are immutable.  Reusing this graph avoids allocating
    CTEs, joins and bind objects for every request while keeping actual values
    as database parameters.  Time filters stay uncached because their bounds
    are deliberately calculated from the current time for each request.
    """
    filters = []
    if shape.has_registration_policy:
        filters.append(Event.policy == bindparam("registration_policy"))
    if shape.has_event_ids:
        filters.append(Event.id.in_(bindparam("event_ids", expanding=True)))
    if shape.has_event_type:
        filters.append(Event.type == bindparam("event_type"))
    if shape.has_event_status:
        filters.append(Event.status == bindparam("event_status"))
    if shape.has_creator_sub:
        filters.append(Event.creator_sub == bindparam("creator_sub"))

    campus_start_date = func.date(func.timezone("Asia/Almaty", Event.start_datetime))
    if shape.has_start_date:
        filters.append(campus_start_date >= bindparam("start_date"))
    if shape.has_end_date:
        filters.append(campus_start_date <= bindparam("end_date"))

    return _build_event_screen_statement(
        filters,
        viewer_sub=bindparam("viewer_sub") if shape.has_viewer else None,
        offset=None if shape.is_keyword_search else bindparam("offset"),
        limit=None if shape.is_keyword_search else bindparam("limit"),
        sort_by_display_datetime=shape.sort_by_display_datetime,
    )


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
        for attribute, value in event_data.model_dump(
            exclude_unset=True, exclude={"media_ids_to_delete"}
        ).items():
            if hasattr(event, attribute):
                setattr(event, attribute, value)
        await self.db_session.flush()
        await self.db_session.refresh(event)
        return event

    @staticmethod
    async def upsert_search(meilisearch_client: AsyncClient, event: Event) -> None:
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

    @staticmethod
    async def delete_from_search(meilisearch_client: AsyncClient, event_id: int) -> None:
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

    async def list_events_for_screen(
        self,
        event_filter: schemas.EventFilter,
        creator_sub: str | None,
        meilisearch_client: AsyncClient,
        viewer_sub: str | None,
    ) -> tuple[list[tuple], int | None, bool]:
        """Fetch raw events-list screen rows in one database round-trip.

        The former service implementation issued one query for the page, then
        separate queries for total, media, attendees, creators and viewer
        flags.  Under concurrent load that prolonged each UoW's pool checkout.
        This query pages first and joins pre-aggregated per-event data so media
        rows cannot multiply attendee counts.
        """
        meili_result: dict | None = None
        event_ids: list[int] | None = None
        if event_filter.keyword:
            meili_result = await meilisearch.get(
                client=meilisearch_client,
                storage_name=EntityType.community_events.value,
                keyword=event_filter.keyword,
                page=event_filter.page,
                size=event_filter.size,
                filters=None,
            )
            event_ids = [item["id"] for item in meili_result.get("hits", []) if "id" in item]
            if not event_ids:
                return [], meili_result.get("estimatedTotalHits", 0), True

        page = max(1, event_filter.page or 1)
        execute_parameters: dict[str, object] | None = None
        if event_filter.time_filter:
            # Bounds for these filters depend on the current instant, so they
            # intentionally remain per-request expressions.
            stmt = _build_event_screen_statement(
                self._build_event_filters(event_filter, creator_sub, event_ids),
                viewer_sub=viewer_sub,
                offset=None if event_filter.keyword else (page - 1) * event_filter.size,
                limit=None if event_filter.keyword else event_filter.size,
                sort_by_display_datetime=event_filter.sort_by_display_datetime,
            )
        else:
            shape = _EventScreenQueryShape(
                has_registration_policy=event_filter.registration_policy is not None,
                has_event_ids=event_ids is not None,
                has_event_type=event_filter.event_type is not None,
                has_event_status=event_filter.event_status is not None,
                has_creator_sub=creator_sub is not None,
                has_start_date=event_filter.start_date is not None,
                has_end_date=event_filter.end_date is not None,
                has_viewer=viewer_sub is not None,
                is_keyword_search=event_filter.keyword is not None,
                sort_by_display_datetime=event_filter.sort_by_display_datetime,
            )
            execute_parameters = {}
            if shape.has_registration_policy:
                execute_parameters["registration_policy"] = event_filter.registration_policy
            if shape.has_event_ids:
                execute_parameters["event_ids"] = event_ids
            if shape.has_event_type:
                execute_parameters["event_type"] = event_filter.event_type
            if shape.has_event_status:
                execute_parameters["event_status"] = event_filter.event_status
            if shape.has_creator_sub:
                execute_parameters["creator_sub"] = creator_sub
            if shape.has_start_date:
                execute_parameters["start_date"] = event_filter.start_date
            if shape.has_end_date:
                execute_parameters["end_date"] = event_filter.end_date
            if shape.has_viewer:
                execute_parameters["viewer_sub"] = viewer_sub
            if not shape.is_keyword_search:
                execute_parameters["offset"] = (page - 1) * event_filter.size
                execute_parameters["limit"] = event_filter.size
            stmt = _cached_event_screen_statement(shape)

        result = await self.db_session.execute(stmt, execute_parameters)
        keyword_total = meili_result.get("estimatedTotalHits", 0) if event_filter.keyword else None
        raw_rows = result.all()
        return raw_rows, keyword_total, False

    @staticmethod
    def build_event_list_screen_rows(
        raw_rows: list[tuple], total: int | None
    ) -> tuple[list[EventListScreenRow], int]:
        """Materialize buffered query rows after the UoW releases its connection."""
        rows: dict[int, EventListScreenRow] = {}
        for (
            event,
            creator,
            media,
            result_total,
            attendees_count,
            is_going,
            is_viewer,
        ) in raw_rows:
            total = int(result_total or 0) if total is None else total
            item = rows.setdefault(
                event.id,
                EventListScreenRow(
                    event=event,
                    creator=creator,
                    attendees_count=attendees_count,
                    is_going=bool(is_going),
                    is_attendee_viewer=bool(is_viewer),
                ),
            )
            if media is not None:
                item.media.append(media)

        return list(rows.values()), total or 0

    @staticmethod
    def _build_event_filters(
        event_filter: schemas.EventFilter,
        creator_sub: str | None,
        event_ids: list[int] | None = None,
    ) -> list:
        filters = []
        if event_filter.registration_policy:
            filters.append(Event.policy == event_filter.registration_policy)
        if event_ids is not None:
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
            campus_start_date = func.date(func.timezone("Asia/Almaty", Event.start_datetime))
            if event_filter.start_date:
                filters.append(campus_start_date >= event_filter.start_date)
            if event_filter.end_date:
                filters.append(campus_start_date <= event_filter.end_date)
        return filters

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

    async def list_attendee_viewer_event_ids(self, event_ids: List[int], user_sub: str) -> set[int]:
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

    async def get_access_invite_by_token_hash(self, token_hash: str) -> EventAccessInvite | None:
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
