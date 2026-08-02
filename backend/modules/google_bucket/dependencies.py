import asyncio
import json

from fastapi import HTTPException, Request, status
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import id_token

from backend.core.configs.config import Config
from backend.modules.auth.dependencies import set_request_access_actor
from backend.modules.courses.registrar.service import (
    RegistrarService,
    ScheduleCatalogFinalizeError,
)
from backend.modules.google_bucket import schemas
from backend.modules.google_bucket.interfaces import (
    ScheduleCatalogFinalizeOutcome,
    ScheduleCatalogOnFinalize,
)
from backend.modules.media.models import EntityType, MediaFormat
from backend.modules.media.schemas import MediaUpsertData


class ScheduleCatalogFinalizeFailed(Exception):
    """Port-level failure for catalog finalize; API maps to HTTP 5xx."""


class _ScheduleCatalogOnFinalizeAdapter:
    """Adapts RegistrarService catalog finalize to google_bucket port."""

    def __init__(self, registrar: RegistrarService) -> None:
        self._registrar = registrar

    async def on_object_finalize(
        self,
        *,
        generation: str | None,
        md5_hash: str | None = None,
        etag: str | None = None,
    ) -> ScheduleCatalogFinalizeOutcome:
        try:
            result = await self._registrar.on_catalog_object_finalize(
                generation=generation,
                md5_hash=md5_hash,
                etag=etag,
            )
        except ScheduleCatalogFinalizeError as exc:
            raise ScheduleCatalogFinalizeFailed(str(exc)) from exc
        return ScheduleCatalogFinalizeOutcome(
            skipped=result.skipped,
            schedule_docs=result.schedule_docs,
            reason=result.reason,
        )


def get_schedule_catalog_on_finalize(request: Request) -> ScheduleCatalogOnFinalize:
    config: Config = request.app.state.config
    registrar = RegistrarService(
        meilisearch_client=request.app.state.meilisearch_client,
        redis=request.app.state.redis,
        storage_client=request.app.state.storage_client,
        bucket_name=config.BUCKET_NAME,
        schedule_gcs_object=config.SCHEDULE_SYNC_GCS_OBJECT,
    )
    return _ScheduleCatalogOnFinalizeAdapter(registrar)


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

    set_request_access_actor(request, actor="pubsub")
    return claims


def get_media_metadata(
    pubsub_message: schemas.PubSubMessage,
) -> MediaUpsertData:
    """
    Parses a GCS event from a Pub/Sub message and returns media upsert data.
    """
    try:
        gcs_event: schemas.GCSEventData = pubsub_message.message.gcs_event
        return MediaUpsertData(
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
    """
    gcs_event: schemas.GCSEventData = pubsub_message.message.gcs_event
    config: Config = request.app.state.config
    parts = gcs_event.name.split("/", maxsplit=1)
    if len(parts) < 2 or parts[0] != config.ROUTING_PREFIX:
        raise HTTPException(status_code=200, detail="outside_routing_prefix")
