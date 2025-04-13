from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Request, HTTPException

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from .schemas import ClubResponseSchema, ClubRequestSchema, ClubEventResponseSchema
from .utils import build_club_response
from ...core.database.models import Club, ClubEvent
from ...core.database.models.media import MediaSection, MediaPurpose


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


async def get_club_events(
    club_id: int,
    request: Request,
    session: AsyncSession,
) -> ClubEventResponseSchema:
    query = (
        select(ClubEvent)
        .options(selectinload(ClubEvent.club))
        .filter_by(club_id=club_id)
        .order_by(ClubEvent.created_at.desc())
    )
    result  = await session.execute(query)
    events = result.scalars().all()
    return events




