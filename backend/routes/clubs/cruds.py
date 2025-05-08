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
    result = await session.execute(select(Club).where(Club.id == club_id))
    return result.scalar_one_or_none()


async def add_club(club_data: ClubRequestSchema, session: AsyncSession) -> Club:
    club: Club = Club(**club_data.dict())
    session.add(club)
    await session.commit()
    return club


async def update_club(session: AsyncSession, new_data: ClubUpdateSchema, club: Club) -> Club:
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
    await session.delete(club)
    await session.commit()


async def get_event(session: AsyncSession, event_id: int) -> Optional[ClubEvent]:
    result = await session.execute(select(ClubEvent).where(ClubEvent.id == event_id))
    return result.scalar_one_or_none()


async def add_event(event_data: ClubEventRequestSchema, session: AsyncSession) -> ClubEvent:
    new_event = ClubEvent(**event_data.dict())
    session.add(new_event)
    await session.commit()
    return new_event


async def update_event(
    session: AsyncSession,
    new_data: ClubEventUpdateSchema,
    event: ClubEvent,
) -> ClubEvent:
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
    await session.delete(event)
    await session.commit()


async def get_club_events(
    club_id: int,
    session: AsyncSession,
    size: int,
    page: int,
) -> List[ClubEvent]:
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
    total_query = select(func.count(model.id))
    total_result = await session.execute(total_query)
    total_count: Optional[int] = total_result.scalar()

    if total_count is None:
        return 0
    return total_count
