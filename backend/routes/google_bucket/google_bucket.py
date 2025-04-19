import base64
import json
import uuid
from datetime import datetime, timedelta
from io import BytesIO
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from google.cloud.exceptions import NotFound
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import check_token, get_db_session
from backend.core.database.models.media import MediaPurpose, MediaSection

from .cruds import confirm_uploaded_media_to_db, delete_media, get_filename
from .schemas import SignedUrlResponse, UploadConfirmation

router = APIRouter(prefix="/bucket", tags=["Google Bucket Routes"])


@router.get(
    "/upload-url",
    response_model=SignedUrlResponse,
)
async def generate_upload_url(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    file_count: int = 1,
):
    if file_count > 10:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot generate more than {10} upload URLs at a time.",
        )

    urls = []
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%S")
    config = request.app.state.config
    base_url = config.CLOUDFLARED_TUNNEL_URL if config.IS_DEBUG else config.NUSPACE
    base_url = base_url.split(sep="https://", maxsplit=1)[1]

    for i in range(file_count):

        filename = f"{base_url}/{user.get('sub')}_{timestamp}_{uuid.uuid4().hex}"
        blob = request.app.state.storage_client.bucket(
            request.app.state.config.BUCKET_NAME
        ).blob(filename)

        # List headers that will be included in the signed URL (values are ignored)
        required_headers = {
            "x-goog-meta-filename": "",  # <- Name is signed, but value is dynamic
            "x-goog-meta-section": "",
            "x-goog-meta-entity-id": "",
            "x-goog-meta-media-purpose": "",
            "x-goog-meta-media-order": "",
            "x-goog-meta-mime-type": "",
            "Content-Type": "",  # Important for MIME type validation
        }

        signed_url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(minutes=15),
            method="PUT",
            headers=required_headers,  # <- Headers are signed, but values are dynamic
        )
        urls.append({"filename": filename, "upload_url": signed_url})
    return {"signed_urls": urls}


@router.post("/upload-image/")
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
    filename: str = Form(...),
    mime_type: str = Form(...),
    section: MediaSection = Form(...),
    entity_id: int = Form(...),
    media_purpose: MediaPurpose = Form(...),
    media_order: int = Form(...),
):

    contents = await file.read()
    bucket = request.app.state.storage_client.bucket(
        request.app.state.config.BUCKET_NAME
    )
    blob = bucket.blob(filename)

    # Set custom metadata
    blob.metadata = {
        "filename": filename,
        "section": section.value,
        "entity-id": str(entity_id),
        "media-purpose": media_purpose.value,
        "media-order": str(media_order),
        "mime-type": mime_type,
    }
    blob.content_type = mime_type
    generation_match_precondition = 0

    # Upload from memory
    blob.upload_from_file(
        BytesIO(contents),
        size=len(contents),
        content_type=mime_type,
        if_generation_match=generation_match_precondition,
    )

    print(f"File {filename} uploaded with metadata.")
    return {"message": "Upload successful"}


@router.post("/gcs-hook")
async def gcs_webhook(
    request: Request, db_session: AsyncSession = Depends(get_db_session)
):
    try:
        body = await request.json()
        message = body.get("message", {})
        data_b64 = message.get("data")

        if not data_b64:
            raise HTTPException(
                status_code=400, detail="Missing 'data' in Pub/Sub message."
            )

        decoded_data = base64.b64decode(data_b64).decode("utf-8")
        gcs_event = json.loads(decoded_data)

        object_name = gcs_event.get("name")
        bucket_name = gcs_event.get("bucket")

        if not object_name or not bucket_name:
            raise HTTPException(
                status_code=400, detail="Missing 'name' or 'bucket' in event data."
            )

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
            section=MediaSection(blob.metadata.get("section")),
            entity_id=int(blob.metadata["entity-id"]),
            media_purpose=MediaPurpose(blob.metadata["media-purpose"]),
            media_order=int(blob.metadata.get("media-order")),
        )
        await confirm_uploaded_media_to_db(confirmation, db_session)
        return {"status": "ok"}

    except (ValueError, json.JSONDecodeError) as e:
        raise HTTPException(
            status_code=400, detail=f"Invalid data or metadata: {str(e)}"
        )


@router.delete("/{filename}")
async def delete_bucket_object(
    request: Request, media_id: int, db_session: AsyncSession = Depends(get_db_session)
):
    filename = await get_filename(db_session, media_id)
    blob = request.app.state.storage_client.bucket(
        request.app.state.config.BUCKET_NAME
    ).blob(filename)
    try:
        blob.delete()
        await delete_media(db_session, media_id)
        return {"status": "success", "deleted": filename}
    except NotFound:
        raise HTTPException(status_code=404, detail="File not found")
