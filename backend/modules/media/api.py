"""HTTP API for the media module."""

from typing import Annotated, List

from backend.modules.media.dependencies import get_media_service
from backend.modules.media.service import MediaService
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

router = APIRouter(prefix="/media", tags=["Media Routes"])

MAX_RESOLVE_URLS = 100


class ResolveUrlsRequest(BaseModel):
    """Filenames to resolve into fresh signed download URLs."""

    filenames: List[str] = Field(default_factory=list, max_length=MAX_RESOLVE_URLS)


class ResolveUrlsResponse(BaseModel):
    """Mapping of raw GCS filename -> displayable download URL."""

    urls: dict[str, str]


@router.post("/resolve-urls", response_model=ResolveUrlsResponse)
async def resolve_media_urls(
    body: ResolveUrlsRequest,
    media_service: Annotated[MediaService, Depends(get_media_service)],
) -> ResolveUrlsResponse:
    filenames = [f for f in body.filenames if f]
    if len(filenames) > MAX_RESOLVE_URLS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot resolve more than {MAX_RESOLVE_URLS} filenames at a time.",
        )
    urls = await media_service.resolve_filenames(filenames)
    return ResolveUrlsResponse(urls=urls)
