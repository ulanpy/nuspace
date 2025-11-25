import json

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_db_session
from backend.core.configs.config import Config
from backend.core.database.models import (
    Community,
    Event
)
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.media import Media, MediaFormat
from backend.modules.google_bucket import schemas


def get_media_metadata(
    pubsub_message: schemas.PubSubMessage,
) -> schemas.MediaMetadata:
    """
    Parses a GCS event from a Pub/Sub message and returns MediaMetadata.
    Raises HTTPException for cases that should terminate the request with a specific status.
    This is designed to be used as a FastAPI dependency.
    """
    try:
        gcs_event: schemas.GCSEventData = pubsub_message.message.gcs_event
        return schemas.MediaMetadata(
            name=gcs_event.metadata.filename,
            mime_type=gcs_event.metadata.mime_type,
            entity_type=EntityType(gcs_event.metadata.media_table),
            entity_id=int(gcs_event.metadata.entity_id),
            media_format=MediaFormat(gcs_event.metadata.media_format),
            media_order=int(gcs_event.metadata.media_order),
        )
    except (ValueError, json.JSONDecodeError, AttributeError):
        raise HTTPException(status_code=200, detail="invalid_data_format")


def validate_routing_prefix(request: Request, pubsub_message: schemas.PubSubMessage):
    """
    Validates if the GCS event belongs to the current backend service's routing prefix.
    Raises HTTPException if the event's prefix doesn't match the service's routing prefix.

    This is designed to be used as a FastAPI dependency.
    """
    gcs_event: schemas.GCSEventData = pubsub_message.message.gcs_event
    config: Config = request.app.state.config
    parts = gcs_event.name.split("/", maxsplit=1)
    if len(parts) < 2 or parts[0] != config.ROUTING_PREFIX:
        raise HTTPException(status_code=200, detail="outside_routing_prefix")


async def media_exists_or_404(
    media_id: int,
    db_session: AsyncSession = Depends(get_db_session),
) -> Media:
    qb = QueryBuilder(session=db_session, model=Media)

    media: Media | None = await qb.base().filter(Media.id == media_id).first()

    if not media:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found")

    return media


async def check_resource(
    media_id: int,
    db_session: AsyncSession = Depends(get_db_session),
) -> tuple[str, Media]:
    """
    Resolve the owner user_sub for the resource that the media belongs to.

    Ownership mapping by EntityType:
    - community_events: Event.creator_sub (fallback to Community.head if creator_sub is None)
    - communities: Community.head

    Returns:
        Tuple of (owner_user_sub, media_object).

    Raises:
        HTTPException 404 if the parent resource or its owner cannot be determined.
        HTTPException 400 for unsupported entity types.
    """
    qb = QueryBuilder(session=db_session, model=Media)

    # First get the media object
    media: Media | None = await qb.base().filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found")

    entity_type = media.entity_type
    entity_id = media.entity_id

    if entity_type == EntityType.community_events:
        qb_event = QueryBuilder(session=db_session, model=Event)
        event: Event | None = await qb_event.base().filter(Event.id == entity_id).first()
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
        if event.creator_sub:
            return event.creator_sub, media
        # Fallback to community head if no creator_sub
        if event.community_id is not None:
            qb_community = QueryBuilder(session=db_session, model=Community)
            community: Community | None = (
                await qb_community.base().filter(Community.id == event.community_id).first()
            )
            if community and community.head:
                return community.head, media
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event owner not found")

    if entity_type == EntityType.communities:
        qb_community = QueryBuilder(session=db_session, model=Community)
        community: Community | None = (
            await qb_community.base().filter(Community.id == entity_id).first()
        )
        if not community or not community.head:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Community not found")
        return community.head, media

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported entity type")

