from typing import Annotated

from backend.modules.announcements import schemas
from backend.modules.announcements.dependencies import get_announcements_service
from backend.modules.announcements.service import AnnouncementsService, get_latest_telegram_post_id
from backend.modules.auth.dependencies import get_creds_or_guest
from fastapi import APIRouter, Depends, Query

router = APIRouter(
    prefix="/announcements",
    tags=["announcements"],
)


@router.get("/telegram")
async def get_announcements_from_telegram(
    _user: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
):
    """
    Get latest announcements from the public Telegram channel.
    """
    latest_id = await get_latest_telegram_post_id()
    return {"latest_post_id": latest_id}


@router.get("/bundle", response_model=schemas.AnnouncementsBundleResponse)
async def get_announcements_bundle_route(
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    service: AnnouncementsService = Depends(get_announcements_service),
    events_page: int = Query(1, ge=1),
    events_size: int = Query(11, ge=1, le=100),
) -> schemas.AnnouncementsBundleResponse:
    """
    Single endpoint for the announcements landing page to reduce initial request fan-out.

    The single list contains approved upcoming events. Recruitment events are ordered by their
    deadline; all other events are ordered by their start time.
    """
    return await service.get_bundle(
        user=user,
        events_page=events_page,
        events_size=events_size,
    )
