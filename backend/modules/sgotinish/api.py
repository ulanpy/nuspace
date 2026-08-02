from typing import Annotated

from backend.modules.auth.dependencies import get_creds_or_guest
from backend.modules.sgotinish.dependencies import get_otinish_service
from backend.modules.sgotinish.schemas import OtinishPublicStats
from backend.modules.sgotinish.service import OtinishService
from fastapi import APIRouter, Depends

router = APIRouter(
    prefix="/sgotinish",
    tags=["sgotinish"],
)


@router.get("/stats", response_model=OtinishPublicStats)
async def get_otinish_public_stats(
    _user: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    service: Annotated[OtinishService, Depends(get_otinish_service)],
) -> OtinishPublicStats:
    """
    Public aggregate stats (no ticket bodies, no Telegram IDs).
    Used on the website to show that anonymous appeals are active.
    """
    return await service.get_public_stats()
