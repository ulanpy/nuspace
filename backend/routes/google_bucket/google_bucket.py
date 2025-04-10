from typing import Annotated
from fastapi import APIRouter, Depends, Request, HTTPException
from datetime import timedelta, datetime
import uuid
from backend.common.dependencies import check_token, get_db_session
from .__init__ import SignedUrlResponse, UploadConfirmation
from .cruds import confirm_uploaded_media_to_db
from backend.core.database.models.media import MediaPurpose, MediaSection
from sqlalchemy.ext.asyncio import AsyncSession
import base64
import json

router = APIRouter(prefix="/bucket", tags=['Google Bucket Routes'])


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
            detail=f"Cannot generate more than {10} upload URLs at a time."
        )

    urls = []
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%S")
    for i in range(file_count):
        filename = f"{user.get('sub')}_{timestamp}_{uuid.uuid4().hex}"
        blob = request.app.state.storage_client.bucket(request.app.state.config.bucket_name).blob(filename)

        # List headers that will be included in the signed URL (values are ignored)
        required_headers = {
            'x-goog-meta-filename': '',  # <- Name is signed, but value is dynamic
            'x-goog-meta-section': '',
            'x-goog-meta-entity-id': '',
            'x-goog-meta-media-purpose': '',
            'x-goog-meta-media-order': '',
            'x-goog-meta-mime-type': '',
            'Content-Type': '',  # Important for MIME type validation
        }

        signed_url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(minutes=15),
            method="PUT",
            headers=required_headers,  # <- Headers are signed, but values are dynamic
        )
        urls.append({"filename": filename, "upload_url": signed_url})
    return {"signed_urls": urls}


from fastapi import UploadFile, File, Form, Request
from io import BytesIO

@router.post("/upload-image/")
async def upload_image(
        request: Request,
        file: UploadFile = File(...),
        filename: str = Form(...),
        mime_type: str = Form(...),
        section: MediaSection = Form(...),
        entity_id: int = Form(...),
        media_purpose: MediaPurpose = Form(...),
        media_order: int = Form(...)):

    contents = await file.read()
    bucket = request.app.state.storage_client.bucket(request.app.state.config.bucket_name)
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
        if_generation_match=generation_match_precondition
    )

    print(f"File {filename} uploaded with metadata.")
    return {"message": "Upload successful"}





@router.post("/gcs-hook")
async def gcs_webhook(
    request: Request,
    db_session: AsyncSession = Depends(get_db_session)
):
    try:
        body = await request.json()
        print(body)
        pubsub_message = body.get("message", {})
        data_b64 = pubsub_message.get("data")
        if not data_b64:
            raise HTTPException(status_code=400, detail="Missing 'data' in Pub/Sub message.")

        decoded_data = base64.b64decode(data_b64).decode("utf-8")
        gcs_event = json.loads(decoded_data)
        print(gcs_event)
        bucket_name = gcs_event["bucket"]
        object_name = gcs_event["name"]

        # Fetch object from GCS to get full metadata
        bucket = request.app.state.storage_client.bucket(bucket_name)
        blob = bucket.get_blob(object_name)

        if blob is None:
            raise HTTPException(status_code=404, detail="Blob not found in GCS.")

        metadata = blob.metadata or {}
        print(f"Metadata: {metadata}")
        confirmation = UploadConfirmation(
            filename=metadata.get("filename", object_name),
            mime_type=metadata.get("mime-type", blob.content_type or "application/octet-stream"),
            section=MediaSection(metadata.get("section", "kp")),
            entity_id=int(metadata["entity-id"]),
            media_purpose=MediaPurpose(metadata["media-purpose"]),
            media_order=int(metadata.get("media-order", 0))
        )

    except KeyError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required metadata field: {e.args[0]}"
        )
    except (ValueError, json.JSONDecodeError) as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid data or metadata: {str(e)}"
        )

    confirmed_media = await confirm_uploaded_media_to_db(confirmation, db_session)
    return {
        "status": "success",
        "uploaded_media": confirmed_media
    }

