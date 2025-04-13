from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Request, HTTPException
from sqlalchemy.orm import selectinload

from .schemas import ClubResponseSchema, ClubRequestSchema, ClubEventResponseSchema, ListEventSchema, ClubEventRequestSchema
from .utils import build_club_response, build_event_response
from ...core.database.models import Club, ClubEvent
from ...core.database.models.media import MediaSection, MediaPurpose
import asyncio


async def add_new_club(
    request: Request,
    club: ClubRequestSchema,
    session: AsyncSession,
    media_section: MediaSection = MediaSection.ev,
    media_purpose: MediaPurpose = MediaPurpose.club_profile
) -> ClubResponseSchema:
    new_club = Club(**club.dict())
    session.add(new_club)
    await session.commit()
    return await build_club_response(new_club, session, request, media_section, media_purpose)


async def add_new_event(
    request: Request,
    event: ClubEventRequestSchema,
    session: AsyncSession,
    media_section: MediaSection = MediaSection.ev,
    media_purpose: MediaPurpose = MediaPurpose.club_event
) -> ClubEventResponseSchema:
    new_event = ClubEvent(**event.dict())
    session.add(new_event)
    await session.commit()
    return await build_event_response(new_event, session, request, media_section, media_purpose)


async def get_club_events(
    club_id: int,
    request: Request,
    session: AsyncSession,
    size: int,
    page: int,
    media_section: MediaSection = MediaSection.ev
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
    result  = await session.execute(query)
    events = result.scalars().all()
    events_response = list(await asyncio.gather(*(build_event_response(event, session, request, media_section)
                                  for event in events)))

    return ListEventSchema(events=events_response, num_of_pages=num_of_pages)


