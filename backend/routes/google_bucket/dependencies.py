import json

from fastapi import HTTPException, Request

from backend.core.configs.config import Config
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.media import MediaFormat
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
