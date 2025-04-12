from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Request, HTTPException


from .schemas import ClubResponseSchema, ClubRequestSchema
from .utils import build_club_response
from ...core.database.models import Club
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





