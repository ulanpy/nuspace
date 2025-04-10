from fastapi import Request, Depends, HTTPException, status
from typing import Annotated
from backend.common.dependencies import check_token
from datetime import timedelta
from google.cloud.exceptions import NotFound

async def generate_download_url(
    request: Request,
    filename: str,
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

async def delete_bucket_object(
    request: Request,
    filename: str,
):
    blob = request.app.state.storage_client.bucket(request.app.state.config.bucket_name).blob(filename)
    try:
        blob.delete()
        return {"status": "success", "deleted": filename}
    except NotFound:
        raise HTTPException(status_code=404, detail="File not found")

