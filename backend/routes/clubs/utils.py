from typing import List

from fastapi import Request

from backend.core.database.models import Club, ClubEvent
from backend.core.database.models.media import Media
from backend.routes.google_bucket.schemas import MediaResponse
from backend.routes.google_bucket.utils import generate_download_url

from .schemas import (
    ClubEventResponseSchema,
    ClubResponseSchema,
)


async def build_media_response(request: Request, media: Media) -> MediaResponse:
    url_data = await generate_download_url(request, media.name)
    return MediaResponse(
        id=media.id,
        url=url_data["signed_url"],
        mime_type=media.mime_type,
        media_table=media.media_table,
        entity_id=media.entity_id,
        media_format=media.media_format,
        media_order=media.media_order,
    )


async def build_club_response(
    club: Club, media_responses: List[MediaResponse]
) -> ClubResponseSchema:
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
        media=media_responses,
    )


async def build_event_response(
    event: ClubEvent, media_responses: List[MediaResponse]
) -> ClubEventResponseSchema:
    return ClubEventResponseSchema(
        id=event.id,
        club_id=event.club_id,
        name=event.name,
        place=event.place,
        description=event.description,
        duration=event.duration,
        event_datetime=event.event_datetime,
        policy=event.policy,
        created_at=event.created_at,
        updated_at=event.updated_at,
        media=media_responses,
    )
