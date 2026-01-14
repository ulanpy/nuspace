
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_creds_or_guest, get_db_session, get_infra
from backend.common.schemas import Infra
from backend.modules.announcements import schemas
from backend.modules.announcements.service import (
    get_announcements_bundle,
    get_latest_telegram_post_id,
)

router = APIRouter(
    prefix="/announcements",
    tags=["announcements"],
)

@router.get("/telegram")
async def get_announcements_from_telegram():
    """
    Get latest announcements from the public Telegram channel.
    """
    latest_id = await get_latest_telegram_post_id()
    return {"latest_post_id": latest_id}


@router.get("/bundle", response_model=schemas.AnnouncementsBundleResponse)
async def get_announcements_bundle_route(
    request: Request,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    db_session: AsyncSession = Depends(get_db_session),
    infra: Infra = Depends(get_infra),
    photo_albums_page: int = Query(1, ge=1),
    photo_albums_size: int = Query(20, ge=1, le=100),
    communities_page: int = Query(1, ge=1),
    communities_size: int = Query(5, ge=1, le=100),
    events_page: int = Query(1, ge=1),
    events_size: int = Query(5, ge=1, le=100),
) -> schemas.AnnouncementsBundleResponse:
    """
    Single endpoint for the announcements landing page to reduce initial request fan-out.

    Defaults match current frontend usage:
    - photo albums: page=1 size=20
    - recruiting communities: page=1 size=5 (open)
    - events: page=1 size=5 (approved + upcoming)
    """
    return await get_announcements_bundle(
        infra=infra,
        db_session=db_session,
        user=user,
        photo_albums_page=photo_albums_page,
        photo_albums_size=photo_albums_size,
        communities_page=communities_page,
        communities_size=communities_size,
        events_page=events_page,
        events_size=events_size,
    )
