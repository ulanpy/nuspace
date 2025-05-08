import asyncio
from typing import Awaitable, Callable, List, Optional

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.utils import search_for_meilisearch_data
from backend.core.database.models import Club, ClubEvent
from backend.core.database.models.media import Media, MediaFormat, MediaTable
from backend.routes.clubs.schemas import (
    ClubEventResponseSchema,
    ClubResponseSchema,
)
from backend.routes.google_bucket.schemas import MediaResponse
from backend.routes.google_bucket.utils import generate_download_url


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


async def _process_club(
    request: Request,
    club: Club,
    get_media: Callable[[AsyncSession, int, MediaTable, MediaFormat], Awaitable[List[Media]]],
    session: AsyncSession,
    media_format: MediaFormat,
    media_table: MediaTable,
) -> ClubResponseSchema:
    media: List[Media] = await get_media(session, club.id, media_table, media_format)
    media_response: List[MediaResponse] = await build_media_responses(
        request=request, media_objects=media
    )
    return await build_club_response(club, media_response)


async def build_club_responses(
    request: Request,
    clubs: List[Club],
    get_media: Callable[[AsyncSession, int, MediaTable, MediaFormat], Awaitable[List[Media]]],
    session: AsyncSession,
    media_format: MediaFormat = MediaFormat.profile,
    media_table: MediaTable = MediaTable.clubs,
) -> List[ClubResponseSchema]:
    return list(
        await asyncio.gather(
            *(
                _process_club(request, club, get_media, session, media_format, media_table)
                for club in clubs
            )
        )
    )


async def _process_event(
    request: Request,
    event: ClubEvent,
    get_media: Callable[[AsyncSession, int, MediaTable, MediaFormat], Awaitable[List[Media]]],
    session: AsyncSession,
    media_format: MediaFormat,
    media_table: MediaTable,
) -> ClubEventResponseSchema:
    media: List[Media] = await get_media(session, event.id, media_table, media_format)
    media_response: List[MediaResponse] = await build_media_responses(
        request=request, media_objects=media
    )
    return await build_event_response(event, media_response)


async def build_event_responses(
    request: Request,
    events: List[ClubEvent],
    get_media: Callable[[AsyncSession, int, MediaTable, MediaFormat], Awaitable[List[Media]]],
    session: AsyncSession,
    media_format: MediaFormat = MediaFormat.carousel,
    media_table: MediaTable = MediaTable.club_events,
) -> Optional[List[ClubEventResponseSchema]]:
    return list(
        await asyncio.gather(
            *(
                _process_event(request, event, get_media, session, media_format, media_table)
                for event in events
            )
        )
    )


async def build_media_responses(
    request: Request, media_objects: List[Media]
) -> Optional[List[MediaResponse]]:
    return list(
        await asyncio.gather(
            *(build_media_response(request, media_object) for media_object in media_objects)
        )
    )


def calculate_pages(count: int, size: int):
    return max(1, (count + size - 1) // size)


async def pre_search(request: Request, keyword: str, storage_name: str = "events") -> List[str]:
    seen = set()
    distinct_keywords = []
    page = 1

    while len(distinct_keywords) < 5:
        result = await search_for_meilisearch_data(
            request=request,
            storage_name=storage_name,
            keyword=keyword,
            page=page,
            size=20,
        )
        hits = result.get("hits", [])
        if not hits:
            break

        for obj in hits:
            name = obj.get("name")
            if name and name not in seen:
                seen.add(name)
                distinct_keywords.append(name)
                if len(distinct_keywords) >= 5:
                    break

        page += 1
    return distinct_keywords
