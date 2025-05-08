import asyncio
from typing import Awaitable, Callable, List, Optional, TypeVar

from fastapi import Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.utils import search_for_meilisearch_data
from backend.core.database.models import Base, Club, ClubEvent
from backend.core.database.models.media import Media, MediaFormat, MediaTable
from backend.routes.clubs.schemas import (
    ClubEventResponseSchema,
    ClubResponseSchema,
)
from backend.routes.google_bucket.schemas import MediaResponse
from backend.routes.google_bucket.utils import generate_download_url

T = TypeVar("T", bound=Base)
S = TypeVar("S", bound=BaseModel)


async def build_media_response(request: Request, media: Media) -> MediaResponse:
    """
    Generate a signed URL for a media file.

    Parameters:
    - `request` (Request): FastAPI request object.
    - `media` (Media): Media database object.

    Returns:
    - `MediaResponse`: Signed URL and metadata.
    """
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
    """
    Construct a club response with associated media.

    Parameters:
    - `club` (Club): Club object.
    - `media_responses` (List[MediaResponse]): Club's media.

    Returns:
    - `ClubResponseSchema`: Formatted club response.
    """
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
    """
    Construct an event response with associated media.

    Parameters:
    - `event` (ClubEvent): Event object.
    - `media_responses` (List[MediaResponse]): Event's media.

    Returns:
    - `ClubEventResponseSchema`: Formatted event response.
    """
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


async def _process_item(
    request: Request,
    item: T,
    get_media: Callable[[AsyncSession, int, MediaTable, MediaFormat], Awaitable[List[Media]]],
    session: AsyncSession,
    media_format: MediaFormat,
    media_table: MediaTable,
    response_builder: Callable[[T, List[MediaResponse]], Awaitable[S]],
) -> S:
    """
    Internal helper to process a single entity (club/event) and its media.

    Parameters:
    - `item` (T): Club or Event object.
    - `get_media` (Callable): Media-fetching function.
    - `media_format` (MediaFormat): Media format.
    - `media_table` (MediaTable): Media table.
    - `response_builder` (Callable): Schema builder function.

    Returns:
    - `S`: Built response schema (ClubResponseSchema/ClubEventResponseSchema).
    """
    media: List[Media] = await get_media(session, item.id, media_table, media_format)
    media_response: List[MediaResponse] = await build_media_responses(
        request=request, media_objects=media
    )
    return await response_builder(item, media_response)


async def build_responses(
    request: Request,
    items: List[T],
    get_media: Callable[[AsyncSession, int, MediaTable, MediaFormat], Awaitable[List[Media]]],
    session: AsyncSession,
    media_format: MediaFormat,
    media_table: MediaTable,
    response_builder: Callable[[T, List[MediaResponse]], Awaitable[S]],
) -> List[S]:
    """
    Build API responses for entities (clubs/events) with associated media.

    Parameters:
    - `items` (List[T]): List of entities (Club/ClubEvent).
    - `response_builder` (Callable): Function to create the response schema.
    - `media_format` (MediaFormat): Media format (e.g., profile, carousel).
    - `media_table` (MediaTable): Media table (e.g., clubs, club_events).

    Returns:
    - `List[S]`: List of response schemas with media.
    """
    return list(
        await asyncio.gather(
            *(
                _process_item(
                    request, item, get_media, session, media_format, media_table, response_builder
                )
                for item in items
            )
        )
    )


async def build_media_responses(
    request: Request, media_objects: List[Media]
) -> Optional[List[MediaResponse]]:
    """
    Generate media responses for a list of media objects.

    Parameters:
    - `request` (Request): FastAPI request object.
    - `media_objects` (List[Media]): Media objects.

    Returns:
    - `List[MediaResponse] | None`: List of media responses.
    """
    return list(
        await asyncio.gather(
            *(build_media_response(request, media_object) for media_object in media_objects)
        )
    )


def calculate_pages(count: int, size: int):
    """
    Calculate total pages for pagination.

    Parameters:
    - `count` (int): Total items.
    - `size` (int): Items per page.

    Returns:
    - `int`: Total pages (minimum 1).
    """
    return max(1, (count + size - 1) // size)


async def pre_search(request: Request, keyword: str, storage_name: str = "events") -> List[str]:
    """
    Fetch search suggestions from Meilisearch.

    Parameters:
    - `request` (Request): FastAPI request object.
    - `keyword` (str): Search term.
    - `storage_name` (str): Index name (default: "events").

    Returns:
    - `List[str]`: Distinct search suggestions (max 5).
    """
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
