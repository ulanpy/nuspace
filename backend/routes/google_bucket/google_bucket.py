from typing import Annotated, List
from fastapi import APIRouter, Request, Depends, status
from datetime import timedelta
from fastapi import HTTPException
from google.cloud.exceptions import NotFound
import uuid
from datetime import datetime

from backend.common.dependencies import validate_access_token_dep
from .__init__ import SignedUrlResponse, UploadConfirmation

router = APIRouter(prefix="/bucket", tags=['Google Bucket Routes'])


@router.get(
    "/download-url/{filename}",
    response_model=SignedUrlResponse,
    summary="Generate secure download URL",
    description="Creates a time-limited URL for downloading a specific file from storage"
)
async def generate_download_url(
    request: Request,
    filename: str,
    user: Annotated[dict, Depends(validate_access_token_dep)]  # Add the dependency here
):
    """
    Generates a signed download URL with:
    - 15 minute expiration
    - GET access only
    - Requires valid JWT
    """
    blob = request.app.state.storage_client.bucket(request.app.state.config.bucket_name).blob(filename)
    signed_url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=15),
        method="GET",
    )
    return {"signed_url": signed_url}


@router.get(
    "/upload-url/objects",
    response_model=SignedUrlResponse,
    summary="Generate secure upload URL for Google Cloud Storage Bucket",
    description="Creates a time-limited URL for uploading files directly to cloud storage"
)
async def generate_upload_url(
        request: Request,
        user: Annotated[dict, Depends(validate_access_token_dep)],
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
        request: Request,
        confirmations: List[UploadConfirmation],  # List of confirmations
        user: dict = Depends(validate_access_token_dep)
):
    """
    Stores metadata for multiple uploaded files:
    - Ensures the filenames were generated before
    - Saves MIME types
    - Marks files as uploaded
    """

    failed_confirmations = []
    successful_confirmations = []

    for confirmation in confirmations:
        filename = confirmation.filename

        if filename not in UPLOAD_METADATA_DB:
            failed_confirmations.append({"filename": filename, "error": "Invalid filename."})
            continue

        # Store MIME type and mark as uploaded
        UPLOAD_METADATA_DB[filename] = {
            "uploaded": True,
            "mime_type": confirmation.mime_type
        }
        successful_confirmations.append({"filename": filename, "mime_type": confirmation.mime_type})

    response = {"successful": successful_confirmations}

    if failed_confirmations:
        response["failed"] = failed_confirmations

    return response


@router.delete(
    "/objects/{filename}",
    summary="Delete an object from GCP bucket",
)
async def delete_object(
    request: Request,
    filename: str,
    user: Annotated[dict, Depends(validate_access_token_dep)]
):
    blob = request.app.state.storage_client.bucket(request.app.state.config.bucket_name).blob(filename)
    try:
        blob.delete()
        return {"status": "success", "deleted": filename}
    except NotFound:
        raise HTTPException(status_code=404, detail="File not found")


