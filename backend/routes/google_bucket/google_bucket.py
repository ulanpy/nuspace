from typing import Annotated
from fastapi import APIRouter, Request, Depends
from datetime import timedelta

from backend.common.dependencies import validate_access_token_dep

router = APIRouter(tags=['Auth Routes'])


@router.get("/generate-download-url")
async def generate_download_url(
    request: Request,
    filename: str,
    user: Annotated[dict, Depends(validate_access_token_dep)]  # Add the dependency here
):
    blob = request.app.state.storage_client.bucket(request.app.state.config.bucket_name).blob(filename)
    signed_url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=15),
        method="GET",
    )
    return {"signed_url": signed_url}


