from typing import Annotated, List
from fastapi import APIRouter, Request, Depends, status
from datetime import timedelta
from fastapi import HTTPException
from google.cloud.exceptions import NotFound
import uuid
from datetime import datetime
from backend.common.dependencies import check_token, get_db_session
from .__init__ import SignedUrlResponse, UploadConfirmation
from .cruds import confirm_uploaded_media_to_db
from backend.core.database.models.media import Media, MediaPurpose, MediaSection
from sqlalchemy.ext.asyncio import AsyncSession


router = APIRouter(prefix="/bucket", tags=['Google Bucket Routes'])



@router.get(
    "/upload",
    response_model=SignedUrlResponse,
    summary="Generate secure upload URL for Google Cloud Storage Bucket",
    description="Creates a time-limited URL for uploading files directly to cloud storage"
)
async def generate_upload_url(
        request: Request,
        user: Annotated[dict, Depends(check_token)],
        file_count: int = 1
):
    """
    Generates a signed upload URL(-s) with:
    - 15 minute expiration
    - Max 10 file_count
    - PUT method required
    - Content-Type validation
    - Requires valid JWT
    """

    if file_count > 10:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot generate more than {10} upload URLs at a time."
        )

    urls = []
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%S")  # UTC timestamp
    for _ in range(file_count):
        filename = f"{user.get('sub')}_{timestamp}_{uuid.uuid4().hex}"  # Generate unique filename
        blob = request.app.state.storage_client.bucket(request.app.state.config.bucket_name).blob(filename)
        signed_url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(minutes=15),
            method="PUT",
            content_type="application/octet-stream",  # Unknown data type
        )
        urls.append({"filename": filename, "upload_url": signed_url})
    return {"signed_urls": urls}



@router.post(
        "/upload/confirm",
        summary="Confirm multiple file uploads",
        description="After uploading, client confirms by sending a list of filenames and MIME types."
    )
async def confirm_uploads(
            confirmations: List[UploadConfirmation],
            user: dict = Depends(check_token),
            db_session: AsyncSession = Depends(get_db_session)
    ):
    """
    Processes a list of upload confirmations and creates corresponding Media records.
    Each confirmation is expected to include:
    - filename: the file's unique name (as generated during URL creation)
    - mime_type: the file's MIME type
    - entity_id: the associated product ID (or other entity identifier)
    - media_purpose: indicates the image type (e.g., banner, thumbnail, etc.)
    - (optionally) section: the media section (default is "kp" for Kupi-Prodai)
    """
    confirmed_media = await confirm_uploaded_media_to_db(confirmations, db_session)
    return {
        "status": "success",
        "uploaded_media": [media.name for media in confirmed_media]
    }

