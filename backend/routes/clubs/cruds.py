from datetime import datetime
from typing import List, Optional, Type

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.core.database.models import Base, Club, ClubEvent
from backend.core.database.models.club import ClubType, EventPolicy
from backend.core.database.models.media import Media, MediaFormat, MediaTable
from backend.routes.clubs.enums import OrderEvents
from backend.routes.clubs.schemas import (
    ClubEventRequestSchema,
    ClubEventUpdateSchema,
    ClubRequestSchema,
    ClubUpdateSchema,
)


async def get_club(session: AsyncSession, club_id: int) -> Optional[Club]:
    """
    Fetch a club by its ID.

    Parameters:
    - `session` (AsyncSession): Database session.
    - `club_id` (int): Club ID.

    Returns:
    - `Club | None`: Club object or `None` if not found.
    """
    result = await session.execute(select(Club).where(Club.id == club_id))
    return result.scalar_one_or_none()


async def add_club(club_data: ClubRequestSchema, session: AsyncSession) -> Club:
    """
    Insert a new club into the database.

    Parameters:
    - `club_data` (ClubRequestSchema): Club data.
    - `session` (AsyncSession): Database session.

    Returns:
    - `Club`: The created club.
    """
    club: Club = Club(**club_data.dict())
    session.add(club)
    await session.commit()
    return club


async def update_club(session: AsyncSession, new_data: ClubUpdateSchema, club: Club) -> Club:
    """
    Insert a new club into the database.

    Parameters:
    - `club_data` (ClubRequestSchema): Club data.
    - `session` (AsyncSession): Database session.

    Returns:
    - `Club`: The created club.
    """
    if new_data.name is not None:
        club.name = new_data.name
    if new_data.description is not None:
        club.description = new_data.description
    if new_data.telegram_url is not None:
        club.telegram_url = new_data.telegram_url
    if new_data.instagram_url is not None:
        club.instagram_url = new_data.instagram_url

    await session.commit()
    await session.refresh(club)

    return club


async def delete_club(session: AsyncSession, club: Club) -> None:
    """
    Delete a club from the database.

    Parameters:
    - `session` (AsyncSession): Database session.
    - `club` (Club): Club to delete.
    """
    await session.delete(club)
    await session.commit()


async def get_event(session: AsyncSession, event_id: int) -> Optional[ClubEvent]:
    """
    Fetch an event by its ID.

    Parameters:
    - `session` (AsyncSession): Database session.
    - `event_id` (int): Event ID.

    Returns:
    - `ClubEvent | None`: Event object or None if not found.
    """
    result = await session.execute(select(ClubEvent).where(ClubEvent.id == event_id))
    return result.scalar_one_or_none()


async def add_event(event_data: ClubEventRequestSchema, session: AsyncSession) -> ClubEvent:
    """
    Insert a new event into the database.

    Parameters:
    - `event_data` (ClubEventRequestSchema): Event data.
    - `session` (AsyncSession): Database session.

    Returns:
    - `ClubEvent`: The created event.
    """
    new_event = ClubEvent(**event_data.dict())
    session.add(new_event)
    await session.commit()
    return new_event


async def update_event(
    session: AsyncSession,
    new_data: ClubEventUpdateSchema,
    event: ClubEvent,
) -> ClubEvent:
    """
    Update an existing event.

    Parameters:
    - `session` (AsyncSession): Database session.
    - `new_data` (ClubEventUpdateSchema): Updated event data.
    - `event` (ClubEvent): Existing event object.

    Returns:
    - `ClubEvent`: The updated event.
    """
    if new_data.name is not None:
        event.name = new_data.name
    if new_data.place is not None:
        event.place = new_data.place
    if new_data.description is not None:
        event.description = new_data.description
    if new_data.duration is not None:
        event.duration = new_data.duration
    if new_data.event_datetime is not None:
        event.event_datetime = new_data.event_datetime
    if new_data.policy is not None:
        event.policy = new_data.policy

    await session.commit()
    await session.refresh(event)

    return event


async def delete_event(session: AsyncSession, event: ClubEvent) -> None:
    """
    Delete an event from the database.

    Parameters:
    - `session` (AsyncSession): Database session.
    - `event` (ClubEvent): Event to delete.
    """
    await session.delete(event)
    await session.commit()


async def get_club_events(
    club_id: int,
    session: AsyncSession,
    size: int,
    page: int,
) -> List[ClubEvent]:
    """
    Fetch events for a specific club with pagination.

    Parameters:
    - `club_id` (int): Club ID.
    - `session` (AsyncSession): Database session.
    - `size` (int): Items per page.
    - `page` (int): Page number.

    Returns:
    - `List[ClubEvent]`: List of events.
    """
    offset = size * (page - 1)

    query = (
        select(ClubEvent)
        .options(selectinload(ClubEvent.club))
        .filter_by(club_id=club_id)
        .offset(offset)
        .limit(size)
        .order_by(ClubEvent.created_at.desc())
    )
    result = await session.execute(query)
    events = result.scalars().all()
    return list(events)


async def get_events(
    session: AsyncSession,
    size: int,
    page: int,
    club_type: ClubType,
    event_policy: EventPolicy,
    order: OrderEvents,
) -> List[ClubEvent]:
    """
    Fetch events with filtering and sorting options.

    Parameters:
    - `session` (AsyncSession): Database session.
    - `size` (int): Items per page.
    - `page` (int): Page number.
    - `club_type` (ClubType): Filter by club type.
    - `event_policy` (EventPolicy): Filter by event policy.
    - `order` (OrderEvents): Sort order.

    Returns:
    - `List[ClubEvent]`: List of filtered/sorted events.
    """
    offset = size * (page - 1)

    sql_conditions = []
    column = ClubEvent.created_at.desc()
    if club_type:
        sql_conditions.append(Club.type == club_type)
    if event_policy:
        sql_conditions.append(ClubEvent.policy == event_policy)
    if order == order.event_datetime:
        column = getattr(ClubEvent, order.value).asc()
    sql_conditions.append(ClubEvent.event_datetime >= datetime.utcnow())

    query = (
        select(ClubEvent)
        .options(selectinload(ClubEvent.club))
        .where(*sql_conditions)
        .offset(offset)
        .limit(size)
        .order_by(column)
    )
    result = await session.execute(query)
    events = result.scalars().all()
    return list(events)


async def get_clubs(session: AsyncSession, size: int, page: int, club_type: ClubType) -> List[Club]:
    """
    Fetch clubs with optional type filtering.

    Parameters:
    - `session` (AsyncSession): Database session.
    - `size` (int): Items per page.
    - `page` (int): Page number.
    - `club_type` (ClubType): Filter by club type.

    Returns:
    - `List[Club]`: List of clubs.
    """
    offset = size * (page - 1)

    sql_conditions = []
    if club_type:
        sql_conditions.append(Club.type == club_type)

    query = (
        select(Club)
        .where(*sql_conditions)
        .offset(offset)
        .limit(size)
        .order_by(Club.created_at.desc())
    )
    result = await session.execute(query)
    clubs = result.scalars().all()
    return list(clubs)


async def get_certain_events(
    session: AsyncSession,
    event_ids: List[int],
) -> List[ClubEvent]:
    """
    Fetch specific events by their IDs.

    Parameters:
    - `session` (AsyncSession): Database session.
    - `event_ids` (List[int]): List of event IDs.

    Returns:
    - `List[ClubEvent]`: List of events in ascending order by datetime.
    """
    query = (
        select(ClubEvent)
        .where(ClubEvent.id.in_(event_ids))
        .order_by(ClubEvent.event_datetime.asc())
    )
    result = await session.execute(query)
    events = result.scalars().all()
    return list(events)


async def get_media_responses(
    session: AsyncSession,
    entity_id: int,
    media_table: MediaTable,
    media_format: MediaFormat,
) -> List[Media]:
    """
    Fetch media associated with an entity.

    Parameters:
    - `session` (AsyncSession): Database session.
    - `entity_id` (int): ID of the entity (club/event).
    - `media_table` (MediaTable): Table name (clubs/club_events).
    - `media_format` (MediaFormat): Media format (profile/carousel).

    Returns:
    - `List[Media]`: List of media objects.
    """
    media_result = await session.execute(
        select(Media).filter(
            Media.entity_id == entity_id,
            Media.media_table == media_table,
            Media.media_format == media_format,
        )
    )
    media_objects = media_result.scalars().all()
    return list(media_objects)


async def get_count(model: Type[Base], session: AsyncSession) -> int:
    """
    Count records of a given model.

    Parameters:
    - `model` (Type[Base]): SQLAlchemy model class.
    - `session` (AsyncSession): Database session.

    Returns:
    - `int`: Total count of records.
    """
    total_query = select(func.count(model.id))
    total_result = await session.execute(total_query)
    total_count: Optional[int] = total_result.scalar()

    if total_count is None:
        return 0
    return total_count
