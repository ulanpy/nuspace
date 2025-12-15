
from fastapi import APIRouter, HTTPException
from backend.modules.announcements.service import get_latest_telegram_post_id

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
