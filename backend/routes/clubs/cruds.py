import asyncio
from datetime import datetime
from typing import List

from fastapi import Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.routes.clubs.enums import OrderEvents

from ...core.database.models import Club, ClubEvent
from ...core.database.models.club import ClubType, EventPolicy
from ...core.database.models.media import MediaPurpose, MediaSection
from .schemas import (
    ClubEventRequestSchema,
    ClubEventResponseSchema,
    ClubRequestSchema,
    ClubResponseSchema,
    ListClubSchema,
    ListEventSchema,
)
from .utils import build_club_response, build_event_response


async def add_new_club(
    request: Request,
    club: ClubRequestSchema,
    session: AsyncSession,
    media_section: MediaSection = MediaSection.ev,
    media_purpose: MediaPurpose = MediaPurpose.profile,
) -> ClubResponseSchema:
    new_club = Club(**club.dict())
    session.add(new_club)
    await session.commit()
    return await build_club_response(
        new_club, session, request, media_section, media_purpose
    )


async def add_new_event(
    request: Request,
    event: ClubEventRequestSchema,
    session: AsyncSession,
    media_section: MediaSection = MediaSection.ev,
    media_purpose: MediaPurpose = MediaPurpose.vertical_image,
) -> ClubEventResponseSchema:
    new_event = ClubEvent(**event.dict())
    session.add(new_event)
    await session.commit()
    return await build_event_response(
        new_event, session, request, media_section, media_purpose
    )


async def get_club_events(
    club_id: int,
    request: Request,
    session: AsyncSession,
    size: int,
    page: int,
    media_section: MediaSection = MediaSection.ev,
    media_purpose: MediaPurpose = MediaPurpose.vertical_image,
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
            *(
                build_event_response(
                    event, session, request, media_section, media_purpose
                )
                for event in events
            )
        )
    )

    return ListEventSchema(events=events_response, num_of_pages=num_of_pages)


async def get_event_db(
    event_id: int,
    request: Request,
    session: AsyncSession,
    media_section: MediaSection = MediaSection.ev,
    media_purpose: MediaPurpose = MediaPurpose.vertical_image,
) -> ClubEventResponseSchema | List:
    query = select(ClubEvent).filter_by(id=event_id)
    result = await session.execute(query)
    event: ClubEvent = result.scalars().first()
    if event:
        return await build_event_response(
            event, session, request, media_section, media_purpose
        )
    return []


async def get_all_events(
    request: Request,
    session: AsyncSession,
    size: int,
    page: int,
    club_type: ClubType,
    event_policy: EventPolicy,
    order: OrderEvents,
    media_section: MediaSection = MediaSection.ev,
    media_purpose: MediaPurpose = MediaPurpose.vertical_image,
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
            *(
                build_event_response(
                    event, session, request, media_section, media_purpose
                )
                for event in events
            )
        )
    )

    return ListEventSchema(events=events_response, num_of_pages=num_of_pages)


async def get_all_clubs(
    request: Request,
    session: AsyncSession,
    size: int,
    page: int,
    club_type: ClubType,
    media_section: MediaSection = MediaSection.ev,
    media_purpose: MediaPurpose = MediaPurpose.profile,
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
            *(
                build_club_response(
                    club, session, request, media_section, media_purpose
                )
                for club in clubs
            )
        )
    )

    return ListClubSchema(events=clubs_response, num_of_pages=num_of_pages)
