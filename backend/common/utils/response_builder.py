from typing import List, Sequence, Type, TypeVar

from backend.common.dependencies import get_infra
from backend.common.schemas import Infra, MediaResponse
from backend.core.database.models.media import Media
from backend.routes.google_bucket.utils import generate_batch_download_urls
from fastapi import Request
from pydantic import BaseModel
from sqlalchemy.ext.declarative import DeclarativeMeta

T = TypeVar("T", bound=DeclarativeMeta)
R = TypeVar("R", bound=BaseModel)


async def build_media_responses(
    request: Request, media_objects: List[Media]
) -> List[MediaResponse]:
    """
    Generate media responses for a list of media objects using batch signed URL generation.
    This is significantly faster than individual URL generation for multiple media objects.

    Parameters:
    - `request` (Request): FastAPI request object.
    - `media_objects` (List[Media]): Media objects.

    Returns:
    - `List[MediaResponse]`: List of media responses with signed URLs.
    """
    if not media_objects:
        return []

    # Get infra with fresh credentials
    infra = await get_infra(request)

    # Extract all filenames for batch URL generation
    filenames = [media.name for media in media_objects]

    # Generate all signed URLs in one batch operation
    url_data_list = await generate_batch_download_urls(
        infra.storage_client, infra.config, infra.signing_credentials, filenames
    )

    # Build MediaResponse objects with the generated URLs
    return [
        MediaResponse(
            id=media.id,
            url=url_data["signed_url"],
            mime_type=media.mime_type,
            entity_type=media.entity_type,
            entity_id=media.entity_id,
            media_format=media.media_format,
            media_order=media.media_order,
        )
        for media, url_data in zip(media_objects, url_data_list)
    ]


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
    infra: Infra,
    media_objects: List[Media],
    resources: Sequence[T],
    resource_id_field: str = "id",
) -> List[List[MediaResponse]]:
    """
    Maps media objects to their corresponding resources and returns ordered media responses.
    Optimized version that uses batch signed URL generation for maximum performance.

    Args:
        infra: The infrastructure object
        media_objects: List of media objects to map
        resources: Sequence of resources (e.g. events, communities) to map media to
        resource_id_field: Name of the primary key field in the resource (default: "id")

    Returns:
        List of lists of MediaResponse, where each inner list corresponds to the media
        for the resource at the same index in the resources sequence
    """
    if not media_objects or not resources:
        return [[] for _ in resources]

    # Pre-group media objects by entity_id for O(1) lookup instead of O(n) search
    from collections import defaultdict

    media_by_entity_id = defaultdict(list)
    for media in media_objects:
        media_by_entity_id[media.entity_id].append(media)

    # Generate signed URLs for ALL media objects in one batch operation
    all_filenames = [media.name for media in media_objects]
    all_url_data = await generate_batch_download_urls(
        infra.storage_client, infra.config, infra.signing_credentials, all_filenames
    )

    # Create a mapping from media object to its signed URL
    media_to_url = {
        media: url_data["signed_url"] for media, url_data in zip(media_objects, all_url_data)
    }

    # Build the result list maintaining the order of resources
    result = []
    for resource in resources:
        resource_id = getattr(resource, resource_id_field, None)
        resource_media = media_by_entity_id.get(resource_id, [])

        # Build MediaResponse objects using pre-generated URLs
        media_responses = [
            MediaResponse(
                id=media.id,
                url=media_to_url[media],
                mime_type=media.mime_type,
                entity_type=media.entity_type,
                entity_id=media.entity_id,
                media_format=media.media_format,
                media_order=media.media_order,
            )
            for media in resource_media
        ]
        result.append(media_responses)

    return result
