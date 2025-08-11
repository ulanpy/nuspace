import asyncio
from typing import List, Sequence, Type, TypeVar

from backend.common.schemas import MediaResponse
from backend.core.database.models.media import Media
from backend.routes.google_bucket.utils import generate_download_url
from fastapi import Request
from pydantic import BaseModel
from sqlalchemy.ext.declarative import DeclarativeMeta

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


def build_schema(schema_class: Type[BaseModel], *models: BaseModel, **extra_fields) -> BaseModel:
    """
    Build a Pydantic schema instance by combining multiple models and additional fields.

    This utility function creates a new schema instance by merging the data from multiple
    Pydantic models and any additional fields provided. It's useful when you need to
    combine data from multiple models into a single schema response.

    Args:
        schema_class (Type[BaseModel]): The target Pydantic model class to instantiate
        *models (BaseModel): Variable number of Pydantic model instances to merge
        **extra_fields: Additional keyword arguments to include in the final schema

    Returns:
        BaseModel: A new instance of schema_class containing merged data from all sources

    Examples:
        >>> user_model = UserModel(name="John", age=30)
        >>> profile_model = ProfileModel(bio="Developer")
        >>> combined = build_schema(
        ...     UserProfileSchema,
        ...     user_model,
        ...     profile_model,
        ...     extra_field="value"
        ... )

    Note:
        - Later models will override fields from earlier models if there are conflicts
        - Extra fields will override any conflicting fields from the models
    """
    data = {}
    for model in models:
        data.update(model.model_dump())
    data.update(extra_fields)
    return schema_class(**data)


async def map_media_to_resources(
    request: Request,
    media_objects: List[Media],
    resources: Sequence[T],
    resource_id_field: str = "id",
) -> List[List[MediaResponse]]:
    """
    Maps media objects to their corresponding resources and returns ordered media responses.

    Args:
        request: The FastAPI request object
        media_objects: List of media objects to map
        resources: Sequence of resources (e.g. events, communities) to map media to
        resource_id_field: Name of the primary key field in the resource (default: "id")

    Returns:
        List of lists of MediaResponse, where each inner list corresponds to the media
        for the resource at the same index in the resources sequence
    """
    return await asyncio.gather(
        *[
            build_media_responses(
                request=request,
                media_objects=[
                    media
                    for media in media_objects
                    if media.entity_id == getattr(resource, resource_id_field, None)
                ],
            )
            for resource in resources
        ]
    )
