from fastapi import Depends

from backend.modules.announcements.service import AnnouncementsService
from backend.modules.campuscurrent.communities.dependencies import get_community_service
from backend.modules.campuscurrent.events.dependencies import get_event_service


def get_announcements_service(
    community_catalog=Depends(get_community_service),
    event_catalog=Depends(get_event_service),
) -> AnnouncementsService:
    return AnnouncementsService(
        community_catalog=community_catalog,
        event_catalog=event_catalog,
    )
