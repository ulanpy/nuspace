from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Request


from .schemas import ClubResponseSchema, ClubRequestSchema, ClubEventSchema
from .utils import build_club_response

from ...core.database.models import Club
from ...core.database.models.media import MediaSection


async def add_new_club(
    request: Request,
    club: ClubRequestSchema,
    session: AsyncSession,
    media_section: MediaSection = MediaSection.ev
) -> ClubResponseSchema:
    new_club = Club(**club.dict())
    session.add(new_club)
    await session.commit()
    return await build_club_response(new_club, session, request, media_section)



async def add_new_event(
    event: ClubEventSchema,
    session: AsyncSession
) -> ClubEventSchema:
    pass


async def get_events() -> list[ClubEventSchema]:
    pass


async def get_event(
    event_id: int, session: AsyncSession
) -> ClubEventSchema:
    pass

