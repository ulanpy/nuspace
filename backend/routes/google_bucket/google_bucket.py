import base64
import json
import uuid
from datetime import datetime, timedelta
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Request
from google.cloud.exceptions import NotFound
from google.cloud.storage import Bucket
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import check_token, get_db_session
from backend.core.configs.config import Config
from backend.core.database.models.media import EntityType, MediaFormat

from .cruds import confirm_uploaded_media_to_db, delete_media, get_filename
from .schemas import SignedUrlRequest, SignedUrlResponse, UploadConfirmation

router = APIRouter(prefix="/bucket", tags=["Google Bucket Routes"])


@router.post(
    "/upload-url",
    response_model=List[SignedUrlResponse],
)
async def generate_upload_url(
    request: Request,
    signed_url_request: List[SignedUrlRequest],
    user: Annotated[dict, Depends(check_token)],
):
    MAX_UPLOAD_URLS = 5
    if len(signed_url_request) > MAX_UPLOAD_URLS:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot generate more than {MAX_UPLOAD_URLS} upload URLs at a time.",
        )

    urls = []
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%S")
    config: Config = request.app.state.config
    base_url = (config.CLOUDFLARED_TUNNEL_URL if config.IS_DEBUG else config.NUSPACE).split(
        sep="https://", maxsplit=1
    )[1]
    bucket: Bucket = request.app.state.storage_client.bucket(request.app.state.config.BUCKET_NAME)
    for item in signed_url_request:
        filename = f"{base_url}/{user.get('sub')}_{timestamp}_{uuid.uuid4().hex}"
        blob = bucket.blob(filename)

        required_headers = {
            "x-goog-meta-filename": str(filename),
            "x-goog-meta-media-table": item.entity_type.value,
            "x-goog-meta-entity-id": str(item.entity_id),
            "x-goog-meta-media-format": item.media_format.value,
            "x-goog-meta-media-order": str(item.media_order),
            "x-goog-meta-mime-type": item.mime_type,
            "Content-Type": item.mime_type,
        }

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
async def gcs_webhook(request: Request, db_session: AsyncSession = Depends(get_db_session)):
    try:
        body = await request.json()
        message = body.get("message", {})
        data_b64 = message.get("data")

        if not data_b64:
            raise HTTPException(status_code=400, detail="Missing 'data' in Pub/Sub message.")

        decoded_data = base64.b64decode(data_b64).decode("utf-8")
        gcs_event = json.loads(decoded_data)

        object_name = gcs_event.get("name")
        bucket_name = gcs_event.get("bucket")

        if not object_name or not bucket_name:
            raise HTTPException(status_code=400, detail="Missing 'name' or 'bucket' in event data.")

        parts = object_name.split("/", maxsplit=1)
        if len(parts) < 2 or parts[0] != request.app.state.config.ROUTING_PREFIX:
            return {"status": "ok"}

        bucket = request.app.state.storage_client.bucket(gcs_event["bucket"])
        blob = bucket.get_blob(gcs_event["name"])

        if blob is None:
            raise HTTPException(status_code=404, detail="Blob not found in GCS.")
        confirmation = UploadConfirmation(
            filename=blob.metadata.get("filename"),
            mime_type=blob.metadata.get("mime-type"),
            entity_type=EntityType(blob.metadata.get("media-table")),
            entity_id=int(blob.metadata["entity-id"]),
            media_format=MediaFormat(blob.metadata["media-format"]),
            media_order=int(blob.metadata.get("media-order")),
        )
        await confirm_uploaded_media_to_db(confirmation, db_session)
        return {"status": "ok"}

    except (ValueError, json.JSONDecodeError):
        return {"status": "ok"}


@router.delete("/{filename}")
async def delete_bucket_object(
    request: Request, media_id: int, db_session: AsyncSession = Depends(get_db_session)
):
    filename = await get_filename(db_session, media_id)
    blob = request.app.state.storage_client.bucket(request.app.state.config.BUCKET_NAME).blob(
        filename
    )
    try:
        blob.delete()
        await delete_media(db_session, media_id)
        return {"status": "success", "deleted": filename}
    except NotFound:
        raise HTTPException(status_code=404, detail="File not found")
