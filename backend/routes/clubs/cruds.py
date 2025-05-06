import asyncio
from datetime import datetime
from typing import List, Optional

from fastapi import Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.routes.clubs.enums import OrderEvents

from ...core.database.models import Club, ClubEvent
from ...core.database.models.club import ClubType, EventPolicy
from ...core.database.models.media import Media, MediaFormat, MediaTable
from ..google_bucket.schemas import MediaResponse
from .schemas import (
    ClubEventRequestSchema,
    ClubEventResponseSchema,
    ClubRequestSchema,
    ClubResponseSchema,
    ClubUpdateSchema,
    ListClubSchema,
    ListEventSchema,
)
from .utils import build_club_response, build_event_response, build_media_response


async def add_new_club(
    request: Request, club: ClubRequestSchema, session: AsyncSession
) -> ClubResponseSchema:
    new_club = Club(**club.dict())
    session.add(new_club)
    await session.commit()
    media_responses = await get_media_responses(
        session, request, new_club.id, MediaTable.clubs, MediaFormat.profile
    )
    return await build_club_response(new_club, media_responses)


async def update_club(
    request: Request, session: AsyncSession, new_data: ClubUpdateSchema, club: Club
) -> ClubResponseSchema:
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

    media_responses = await get_media_responses(
        session, request, club.id, MediaTable.clubs, MediaFormat.profile
    )
    return await build_club_response(club, media_responses)


async def delete_club(request: Request, session: AsyncSession, club: Club):
    await session.delete(club)
    await session.commit()


async def add_new_event(
    request: Request,
    event: ClubEventRequestSchema,
    session: AsyncSession,
    media_table: MediaTable = MediaTable.club_events,
    media_format: MediaFormat = MediaFormat.carousel,
) -> ClubEventResponseSchema:
    new_event = ClubEvent(**event.dict())
    session.add(new_event)
    await session.commit()
    media_responses = await get_media_responses(
        session, request, new_event.id, media_table, media_format
    )
    return await build_event_response(new_event, media_responses)


async def get_club_by_id(session: AsyncSession, club_id: int) -> Optional[Club]:
    result = await session.execute(select(Club).where(Club.id == club_id))
    return result.scalar_one_or_none()


async def get_club_events(
    club_id: int,
    request: Request,
    session: AsyncSession,
    size: int,
    page: int,
    media_table: MediaTable = MediaTable.club_events,
    media_format: MediaFormat = MediaFormat.carousel,
) -> ListEventSchema:
    offset = size * (page - 1)
    total_query = select(func.count(ClubEvent.id)).filter_by(club_id=club_id)
    total_result = await session.execute(total_query)
    total_count = total_result.scalar()
    num_of_pages = max(1, (total_count + size - 1) // size)
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
    events_response = list(
        await asyncio.gather(
            *[
                build_event_response(
                    event,
                    await get_media_responses(
                        session, request, event.id, media_table, media_format
                    ),
                )
                for event in events
            ]
        )
    )
    return ListEventSchema(events=events_response, num_of_pages=num_of_pages)


async def get_all_events(
    request: Request,
    session: AsyncSession,
    size: int,
    page: int,
    club_type: ClubType,
    event_policy: EventPolicy,
    order: OrderEvents,
    media_table: MediaTable = MediaTable.club_events,
    media_format: MediaFormat = MediaFormat.carousel,
) -> ListEventSchema:
    offset = size * (page - 1)
    total_query = select(func.count(ClubEvent.id))
    total_result = await session.execute(total_query)
    total_count = total_result.scalar()
    num_of_pages = max(1, (total_count + size - 1) // size)

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
    events_response = list(
        await asyncio.gather(
            *[
                build_event_response(
                    event,
                    await get_media_responses(
                        session, request, event.id, media_table, media_format
                    ),
                )
                for event in events
            ]
        )
    )

    return ListEventSchema(events=events_response, num_of_pages=num_of_pages)


async def get_all_clubs(
    request: Request,
    session: AsyncSession,
    size: int,
    page: int,
    club_type: ClubType,
    media_table: MediaTable = MediaTable.clubs,
    media_format: MediaFormat = MediaFormat.profile,
) -> ListClubSchema:
    offset = size * (page - 1)
    total_query = select(func.count(Club.id))
    total_result = await session.execute(total_query)
    total_count = total_result.scalar()
    num_of_pages = max(1, (total_count + size - 1) // size)

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
    clubs_response = list(
        await asyncio.gather(
            *[
                build_club_response(
                    club,
                    await get_media_responses(session, request, club.id, media_table, media_format),
                )
                for club in clubs
            ]
        )
    )

    return ListClubSchema(events=clubs_response, num_of_pages=num_of_pages)


async def get_certain_events(
    request: Request,
    session: AsyncSession,
    event_ids: List[int],
    media_table: MediaTable,
    media_format: MediaFormat,
) -> List[ClubEventResponseSchema]:
    query = (
        select(ClubEvent)
        .where(ClubEvent.id.in_(event_ids))
        .order_by(ClubEvent.event_datetime.asc())
    )
    result = await session.execute(query)
    events = result.scalars().all()

    return list(
        await asyncio.gather(
            *[
                build_event_response(
                    event,
                    await get_media_responses(
                        session, request, event.id, media_table, media_format
                    ),
                )
                for event in events
            ]
        )
    )


async def get_media_responses(
    session: AsyncSession,
    request: Request,
    event_id: int,
    media_table: MediaTable,
    media_format: MediaFormat,
) -> List[MediaResponse]:
    media_result = await session.execute(
        select(Media).filter(
            Media.entity_id == event_id,
            Media.media_table == media_table,
            Media.media_format == media_format,
        )
    )
    media_objects = media_result.scalars().all()
    if media_objects:
        return list(
            await asyncio.gather(
                *(build_media_response(request, media_object) for media_object in media_objects)
            )
        )
    return []
