from fastapi import Request

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.core.database.models import Club
from backend.core.database.models.media import MediaSection, Media, MediaPurpose
from .schemas import ClubResponseSchema
from backend.routes.google_bucket.schemas import MediaResponse
from backend.routes.google_bucket.utils import generate_download_url


async def build_media_response(request: Request,
                               media: Media) -> MediaResponse:
    url_data = await generate_download_url(request, media.name)
    return MediaResponse(
        id=media.id,
        url=url_data["signed_url"],
        mime_type=media.mime_type,
        section=media.section,
        entity_id=media.entity_id,
        media_purpose=media.media_purpose,
        media_order=media.media_order
    )


async def get_media_response(
    session: AsyncSession,
    request: Request,
    club_id: int,
    media_section: MediaSection,
    media_purpose: MediaPurpose
) -> MediaResponse | None:
    """
    Возвращает MediaResponse для заданного клуба.
    """
    media_result = await session.execute(
        select(Media).filter(
                Media.entity_id == club_id,
                        Media.section == media_section,
                        Media.media_purpose == media_purpose
        )
    )
    media_object = media_result.scalars().first()
    if media_object:
        return await build_media_response(request, media_object)
    return None


async def build_club_response(
    club: Club,
    session: AsyncSession,
    request: Request,
    media_section: MediaSection,
    media_purpose: MediaPurpose
) -> ClubResponseSchema:
    media_response = await get_media_response(session, request, club.id, media_section, media_purpose)
    return ClubResponseSchema(
        id=club.id,
        name=club.name,
        type=club.type,
        description=club.description,
        president=club.president,
        telegram_url=club.telegram_url,
        instagram_url=club.instagram_url,
        created_at=club.created_at,
        updated_at=club.updated_at,
        media=media_response
    )
