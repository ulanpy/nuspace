import uuid
from datetime import datetime, timedelta
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from google.cloud.exceptions import NotFound
from google.cloud.storage import Bucket
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_current_principals, get_db_session
from backend.core.configs.config import Config
from backend.core.database.models.media import Media
from backend.routes.google_bucket import dependencies as deps
from backend.routes.google_bucket import schemas

router = APIRouter(prefix="/bucket", tags=["Google Bucket Routes"])


@router.post("/upload-url", response_model=List[schemas.SignedUrlResponse])
async def generate_upload_url(
    request: Request,
    signed_url_request: List[schemas.SignedUrlRequest],
    user: Annotated[dict, Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Generates pre-signed URLs for direct upload to Google Cloud Storage bucket.

    This endpoint creates temporary, secure URLs that allow frontend clients to upload files
    directly to GCS without exposing bucket credentials. Each URL is valid for 15 minutes
    and includes required metadata headers for proper file categorization.

    **How it works:**
    1. Client sends file metadata (entity_type, entity_id, media_format, etc.)
    2. Server generates a unique filename and pre-signed URL with required headers
    3. Client uses the URL to upload file directly to GCS via PUT request
    4. GCS automatically triggers a webhook to /api/bucket/gcs-hook when upload completes

    **Usage:**
    - Send file metadata in request body
    - Receive signed URL and filename
    - Upload file directly to GCS using the signed URL
    - File will be automatically processed via webhook

    **Limitations:**
    - Maximum 5 upload URLs per request
    - Each URL expires in 15 minutes
    - File must be uploaded with exact headers provided

    **Response includes:**
    - filename: Unique identifier for the file in GCS
    - upload_url: Pre-signed URL for direct upload
    - All metadata fields for client reference
    """
    MAX_UPLOAD_URLS = 5
    if len(signed_url_request) > MAX_UPLOAD_URLS:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot generate more than {MAX_UPLOAD_URLS} upload URLs at a time.",
        )

    urls = []
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%S")
    config: Config = request.app.state.config
    bucket: Bucket = request.app.state.storage_client.bucket(request.app.state.config.BUCKET_NAME)


    for item in signed_url_request:
        filename = f"{config.ROUTING_PREFIX}/{user[0].get('sub')}_{timestamp}_{uuid.uuid4().hex}"
        blob = bucket.blob(filename)

        required_headers = {
            config.GCS_METADATA_HEADERS["filename"]: str(filename),
            config.GCS_METADATA_HEADERS[
                "media_table"
            ]: item.entity_type.value,  # pass values since we need str
            config.GCS_METADATA_HEADERS["entity_id"]: str(item.entity_id),
            config.GCS_METADATA_HEADERS["media_format"]: item.media_format.value,
            config.GCS_METADATA_HEADERS["media_order"]: str(item.media_order),
            config.GCS_METADATA_HEADERS["mime_type"]: item.mime_type,
            config.GCS_METADATA_HEADERS["content_type"]: item.mime_type,
        }

        if config.USE_GCS_EMULATOR:
            # Route uploads via backend proxy to emulator to avoid CORS/method issues
            signed_url = f"{config.HOME_URL}/api/bucket/local-upload/{config.BUCKET_NAME}/{filename}"
            # In local dev, write the media record immediately (no Pub/Sub push)
            media_metadata = schemas.MediaMetadata(
                name=filename,
                mime_type=item.mime_type,
                entity_type=item.entity_type,
                entity_id=item.entity_id,
                media_format=item.media_format,
                media_order=item.media_order,
            )
            filters = [
                Media.name == media_metadata.name,
                Media.entity_type == media_metadata.entity_type,
                Media.entity_id == media_metadata.entity_id,
                Media.media_format == media_metadata.media_format,
            ]
            qb = QueryBuilder(db_session, Media)
            existing: Media | None = await qb.base().filter(*filters).first()
            try:
                if existing:
                    await qb.update(instance=existing, update_data=media_metadata)
                else:
                    await qb.add(data=media_metadata)
            except Exception:
                # Best-effort only in local mode; still return URL
                pass
        else:
            signed_url = blob.generate_signed_url(
                version="v4",
                expiration=timedelta(minutes=15),
                method="PUT",
                headers=required_headers,
            )
        urls.append(
            {
                "filename": filename,
                "upload_url": signed_url,
                "entity_type": item.entity_type.value,
                "entity_id": item.entity_id,
                "media_format": item.media_format.value,
                "media_order": item.media_order,
                "mime_type": item.mime_type,
            }
        )

    return urls


@router.post("/gcs-hook")
async def gcs_webhook(
    request: Request,
    db_session: AsyncSession = Depends(get_db_session),
    media_metadata: schemas.MediaMetadata = Depends(deps.get_media_metadata),
    validate_routing_prefix: bool = Depends(deps.validate_routing_prefix),
):
    """
    Processes GCS notifications from Pub/Sub.
    The business logic for creating MediaMetadata is now in get_media_metadata_from_gcs_event.
    The webhook now focuses on the database interaction part.
    """
    filters = [
        Media.name == media_metadata.name,
        Media.entity_type == media_metadata.entity_type,
        Media.entity_id == media_metadata.entity_id,
        Media.media_format == media_metadata.media_format,
    ]
    qb = QueryBuilder(db_session, Media)
    media: Media | None = await qb.base().filter(*filters).first()
    try:
        if media:
            await qb.update(instance=media, update_data=media_metadata)
        else:
            await qb.add(data=media_metadata)
    except Exception:
        # just ack message but log this error in future
        return {"status": "ok"}
    return {"status": "ok"}


@router.delete("/{filename}")
async def delete_bucket_object(
    request: Request, media_id: int, db_session: AsyncSession = Depends(get_db_session)
):
    """
    This endpoint is used by the client(frontend) when he is editing the media carousel
    and during the process deletes the media object from the carousel.
    It deletes the media object from the bucket and the database.
    """
    qb = QueryBuilder(db_session, Media)
    media: Media | None = await qb.base().filter(Media.id == media_id).first()

    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    filename = media.name
    blob = request.app.state.storage_client.bucket(request.app.state.config.BUCKET_NAME).blob(
        filename
    )
    try:
        blob.delete()
        await qb.delete(target=media)
        return {"status": "success", "deleted": filename}
    except NotFound:
        raise HTTPException(status_code=404, detail="File not found")


@router.put("/local-upload/{bucket}/{full_path:path}")
async def local_upload_proxy(
    request: Request,
    bucket: str,
    full_path: str,
):
    """
    Dev-only upload proxy: accepts PUT body and uploads to the emulator via storage client.
    """
    config: Config = request.app.state.config
    if not config.USE_GCS_EMULATOR:
        raise HTTPException(status_code=404, detail="Not available in production")
    storage_client = request.app.state.storage_client
    blob = storage_client.bucket(bucket).blob(full_path)
    try:
        content = await request.body()
        content_type = request.headers.get("content-type", "application/octet-stream")
        blob.upload_from_string(content, content_type=content_type)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/local-download/{bucket}/{full_path:path}")
async def local_download_proxy(
    request: Request,
    bucket: str,
    full_path: str,
):
    """
    Dev-only download proxy: reads from emulator via storage client and returns bytes.
    """
    config: Config = request.app.state.config
    if not config.USE_GCS_EMULATOR:
        raise HTTPException(status_code=404, detail="Not available in production")
    storage_client = request.app.state.storage_client
    blob = storage_client.bucket(bucket).blob(full_path)
    try:
        data = blob.download_as_bytes()
        content_type = blob.content_type or "application/octet-stream"
        return Response(content=data, media_type=content_type)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
