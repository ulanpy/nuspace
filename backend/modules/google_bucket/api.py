import uuid
from datetime import datetime, timedelta
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from google.cloud.storage import Bucket

from backend.common.dependencies import get_creds_or_401
from backend.common.request_url import request_app_base_url
from backend.core.configs.config import Config
from backend.modules.google_bucket import dependencies as deps
from backend.modules.google_bucket import schemas
from backend.modules.media.dependencies import get_media_service
from backend.modules.media.schemas import MediaUpsertData
from backend.modules.media.service import MediaService

router = APIRouter(prefix="/bucket", tags=["Google Bucket Routes"])


@router.post("/upload-url", response_model=List[schemas.SignedUrlResponse])
async def generate_upload_url(
    request: Request,
    signed_url_request: List[schemas.SignedUrlRequest],
    user: Annotated[dict, Depends(get_creds_or_401)],
    media_service: MediaService = Depends(get_media_service),
):
    """
    Generates pre-signed URLs for direct upload to Google Cloud Storage bucket.
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
            ]: item.entity_type.value,
            config.GCS_METADATA_HEADERS["entity_id"]: str(item.entity_id),
            config.GCS_METADATA_HEADERS["media_format"]: item.media_format.value,
            config.GCS_METADATA_HEADERS["media_order"]: str(item.media_order),
            config.GCS_METADATA_HEADERS["mime_type"]: item.mime_type,
            config.GCS_METADATA_HEADERS["content_type"]: item.mime_type,
        }

        if config.USE_GCS_EMULATOR:
            app_base_url = request_app_base_url(request, config)
            signed_url = (
                f"{app_base_url}/api/bucket/local-upload/{config.BUCKET_NAME}/{filename}"
            )
            media_data = MediaUpsertData(
                name=filename,
                mime_type=item.mime_type,
                entity_type=item.entity_type,
                entity_id=item.entity_id,
                media_format=item.media_format,
                media_order=item.media_order,
            )
            try:
                await media_service.upsert(media_data)
            except Exception:
                pass
        else:
            signing_credentials = request.app.state.signing_credentials
            import asyncio

            signed_url = await asyncio.to_thread(
                blob.generate_signed_url,
                version="v4",
                expiration=timedelta(minutes=15),
                method="PUT",
                headers=required_headers,
                credentials=signing_credentials,
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
    media_metadata: MediaUpsertData = Depends(deps.get_media_metadata),
    validate_routing_prefix: bool = Depends(deps.validate_routing_prefix),
    _jwt_claims: dict = Depends(deps.verify_pubsub_token),
    media_service: MediaService = Depends(get_media_service),
):
    """
    Processes GCS notifications from Pub/Sub and upserts media records.
    """
    try:
        await media_service.upsert(media_metadata)
    except Exception:
        return {"status": "ok"}
    return {"status": "ok"}


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
