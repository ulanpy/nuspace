from typing import Annotated
from fastapi import APIRouter, Request, Depends, status
from datetime import timedelta

from backend.common.dependencies import validate_access_token_dep
from .__init__ import SignedUrlResponse

router = APIRouter(tags=['Auth Routes'])


@router.get(
    "/generate-download-url/{filename}",
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
    "/generate-upload-url/{filename}",
    response_model=SignedUrlResponse,
    summary="Generate secure upload URL for Google Cloud Storage Bucket",
    description="Creates a time-limited URL for uploading files directly to cloud storage"
)
async def generate_upload_url(
        request: Request,
        filename: str,  # Still required to specify WHERE to upload
        user: Annotated[dict, Depends(validate_access_token_dep)]
):
    """
    Generates a signed upload URL with:
    - 15 minute expiration
    - PUT method required
    - Content-Type validation
    - Requires valid JWT
    """
    blob = request.app.state.storage_client.bucket(request.app.state.config.bucket_name).blob(filename)
    signed_url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=15),
        method="PUT",
        content_type="application/octet-stream",  # Unknown data type
    )
    return {"signed_url": signed_url}

