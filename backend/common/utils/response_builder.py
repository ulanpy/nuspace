import asyncio
from typing import Awaitable, Callable, List, TypeVar

from fastapi import Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.ext.declarative import DeclarativeMeta

from backend.common import cruds
from backend.core.database.models import Base
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.media import Media, MediaFormat
from backend.routes.google_bucket.schemas import MediaResponse
from backend.routes.google_bucket.utils import generate_download_url

T = TypeVar("T", bound=DeclarativeMeta)
R = TypeVar("R", bound=BaseModel)


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
        entity_type=media.entity_type,
        entity_id=media.entity_id,
        media_format=media.media_format,
        media_order=media.media_order,
    )


async def _process_item[
    T: Base, S: BaseModel
](
    request: Request,
    item: T,
    session: AsyncSession,
    media_format: MediaFormat,
    entity_type: EntityType,
    response_builder: Callable[[T, List[MediaResponse]], Awaitable[S]],
) -> S:
    """
    Internal helper to process a single entity (club/event) and its media.

    Parameters:
    - `item` (T): Base model object (Product, Club, Event etc.)
    - `media_format` (MediaFormat): Media format
    - `entity_type` (EntityType): Entity type
    - `response_builder` (Callable): Schema builder function

    Returns:
    - `S`: Built response schema
    """
    conditions = [
        Media.entity_id == item.id,
        Media.entity_type == entity_type,
        Media.media_format == media_format,
    ]

    media: List[Media] = await cruds.get_resources(
        session=session, model=Media, conditions=conditions, preload_relationships=[]
    )

    media_response: List[MediaResponse] = await build_media_responses(
        request=request, media_objects=media
    )
    return await response_builder(item, media_response)


async def build_responses[
    T: Base, S: BaseModel
](
    request: Request,
    items: List[T],
    session: AsyncSession,
    media_format: MediaFormat,
    entity_type: EntityType,
    response_builder: Callable[[T, List[MediaResponse]], Awaitable[S]],
) -> List[S]:
    """
    Build API responses for entities with associated media.

    Parameters:
    - `items` (List[T]): List of base model objects
    - `response_builder` (Callable): Function to create the response schema
    - `media_format` (MediaFormat): Media format (e.g., profile, carousel)
    - `entity_type` (EntityType): Entity type (e.g., products, clubs)

    Returns:
    - `List[S]`: List of response schemas with media
    """
    return list(
        await asyncio.gather(
            *(
                _process_item(request, item, session, media_format, entity_type, response_builder)
                for item in items
            )
        )
    )


async def build_media_responses(
    request: Request, media_objects: List[Media]
) -> List[MediaResponse]:
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
