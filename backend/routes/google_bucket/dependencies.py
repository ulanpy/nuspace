import json

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_db_session
from backend.core.configs.config import Config
from backend.core.database.models import (
    Community,
    CommunityComment,
    CommunityPost,
    Event,
    Product,
    Review,
)
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.media import Media, MediaFormat
from backend.routes.google_bucket import schemas


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
    - products: Product.user_sub
    - community_posts: CommunityPost.user_sub
    - community_comments: CommunityComment.user_sub
    - community_events: Event.creator_sub (fallback to Community.head if creator_sub is None)
    - communities: Community.head
    - reviews: Review.user_sub

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

    if entity_type == EntityType.products:
        qb_product = QueryBuilder(session=db_session, model=Product)
        product: Product | None = await qb_product.base().filter(Product.id == entity_id).first()
        if not product or not product.user_sub:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        return product.user_sub, media

    if entity_type == EntityType.community_posts:
        qb_post = QueryBuilder(session=db_session, model=CommunityPost)
        post: CommunityPost | None = (
            await qb_post.base().filter(CommunityPost.id == entity_id).first()
        )
        if not post or not post.user_sub:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
        return post.user_sub, media

    if entity_type == EntityType.community_comments:
        qb_comment = QueryBuilder(session=db_session, model=CommunityComment)
        comment: CommunityComment | None = (
            await qb_comment.base().filter(CommunityComment.id == entity_id).first()
        )
        if not comment or not comment.user_sub:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
        return comment.user_sub, media

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

    if entity_type == EntityType.reviews:
        qb_review = QueryBuilder(session=db_session, model=Review)
        review: Review | None = await qb_review.base().filter(Review.id == entity_id).first()
        if not review or not review.user_sub:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
        return review.user_sub, media

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported entity type")


# temporary putted here
# from fastapi import FastAPI, Request, HTTPException, Depends
# from fastapi.responses import JSONResponse
# from jose import jwt
# from jose.exceptions import JWTError, ExpiredSignatureError
# import httpx
# import time

# app = FastAPI()

# GOOGLE_ISSUER = "https://accounts.google.com"
# GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs"

# # In-memory cache for JWKS
# jwks_cache = {"keys": [], "expires_at": 0}


# async def get_google_public_keys():
#     global jwks_cache
#     if time.time() < jwks_cache["expires_at"]:
#         return jwks_cache["keys"]

#     async with httpx.AsyncClient() as client:
#         resp = await client.get(GOOGLE_JWKS_URI)
#         resp.raise_for_status()
#         keys = resp.json()
#         jwks_cache = {
#             "keys": keys["keys"],
#             "expires_at": time.time() + 3600  # Cache for 1 hour
#         }
#         return keys["keys"]


# async def validate_google_jwt(
#     credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
# ) -> dict | None:
#     token = credentials.credentials  # Automatically extracts the Bearer token

#     keys = await get_google_public_keys()
#     if not keys:
#         raise HTTPException(status_code=403, detail="No Google public keys")

#     for key in keys:
#         try:
#             payload = jwt.decode(
#                 token,
#                 key,
#                 algorithms=["RS256"],
#                 issuer=GOOGLE_ISSUER,
#                 audience=config.PUSH_AUTH_AUDIENCE,
#             )
#             if payload.get("email") != config.PUSH_AUTH_SERVICE_ACCOUNT:
#                 raise HTTPException(status_code=403, detail="Invalid service account email")

#             return payload
#         except ExpiredSignatureError:
#             raise HTTPException(status_code=401, detail="Token expired")
#         except JWTError:
#             continue  # Try next key

#     raise HTTPException(status_code=403, detail="Invalid token")
