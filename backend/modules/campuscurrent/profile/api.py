from typing import Annotated

from fastapi import APIRouter, Depends

from backend.modules.auth.dependencies import get_creds_or_guest

router = APIRouter(tags=["Profile"])


@router.get("/profile")
async def get_profile(
    _user: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
):
    return
