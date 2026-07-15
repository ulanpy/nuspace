import asyncio
import json

from fastapi import Depends, HTTPException, Request, status
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import id_token
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_db_session
from backend.core.configs.config import Config
from backend.core.database.models import (
    Community,
    Event
)
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.media import Media, MediaFormat
from backend.modules.google_bucket import schemas


async def verify_pubsub_token(request: Request) -> dict:
    """
    Validates the Authorization bearer token sent by Pub/Sub push.
    Ensures the token is signed by Google, matches the configured audience,
    and was issued for the expected service account email.
    """
    auth_header = request.headers.get("authorization")
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing_bearer_token")

    token = auth_header.split(" ", 1)[1].strip()
    config: Config = request.app.state.config

    try:
        claims = await asyncio.to_thread(
            id_token.verify_oauth2_token,
            token,
            GoogleAuthRequest(),
            config.PUSH_AUTH_AUDIENCE,
        )
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")

    if claims.get("iss") not in {"accounts.google.com", "https://accounts.google.com"}:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token_issuer")

    expected_email = config.PUSH_AUTH_SERVICE_ACCOUNT
    if claims.get("email") != expected_email or claims.get("email_verified") is False:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token_email")

    return claims


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
    stmt = select(Media).where(Media.id == media_id)
    result = await db_session.execute(stmt)
    media: Media | None = result.scalars().first()

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
    stmt = select(Media).where(Media.id == media_id)
    result = await db_session.execute(stmt)
    media: Media | None = result.scalars().first()
    if not media:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found")

    entity_type = media.entity_type
    entity_id = media.entity_id

    if entity_type == EntityType.community_events:
        event_stmt = select(Event).where(Event.id == entity_id)
        event_result = await db_session.execute(event_stmt)
        event: Event | None = event_result.scalars().first()
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
        if event.creator_sub:
            return event.creator_sub, media
        if event.community_id is not None:
            community_stmt = select(Community).where(Community.id == event.community_id)
            community_result = await db_session.execute(community_stmt)
            community: Community | None = community_result.scalars().first()
            if community and community.head:
                return community.head, media
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event owner not found")

    if entity_type == EntityType.communities:
        community_stmt = select(Community).where(Community.id == entity_id)
        community_result = await db_session.execute(community_stmt)
        community: Community | None = community_result.scalars().first()
        if not community or not community.head:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Community not found")
        return community.head, media

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported entity type")
