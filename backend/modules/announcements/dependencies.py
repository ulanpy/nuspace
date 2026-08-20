from backend.modules.announcements.service import AnnouncementsService
from backend.modules.campuscurrent.events.dependencies import get_event_service
from fastapi import Depends


async def get_announcements_service(
    event_catalog=Depends(get_event_service),
) -> AnnouncementsService:
    return AnnouncementsService(event_catalog=event_catalog)
