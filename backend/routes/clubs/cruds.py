from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Request, HTTPException


from .schemas import ClubResponseSchema, ClubRequestSchema, ClubEventRequestSchema, ClubEventResponseSchema
from .utils import build_club_response, build_event_response
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





