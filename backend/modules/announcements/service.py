import httpx
import re
from typing import Optional
import logging

logger = logging.getLogger(__name__)

CHANNEL_URL = "https://t.me/s/nuspacechannel"

POST_ID_PATTERN = re.compile(r'data-post="[^"]+/(\d+)"')

async def get_latest_telegram_post_id() -> Optional[int]:
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(CHANNEL_URL, follow_redirects=True)
            response.raise_for_status()
            
            matches = POST_ID_PATTERN.findall(response.text)
            
            if not matches:
                return None
            
            latest_id = int(matches[-1])
            return latest_id

    except Exception as e:
        logger.error(f"Failed to fetch telegram posts: {e}")
        return None


async def get_announcements_bundle(
    *,
    infra,
    db_session,
    user: tuple[dict, dict],
    photo_albums_page: int = 1,
    photo_albums_size: int = 20,
    communities_page: int = 1,
    communities_size: int = 5,
    events_page: int = 1,
    events_size: int = 5,
):
    """
    Aggregate data required by the announcements landing page into a single response.

    NOTE: We intentionally run these sequentially because SQLAlchemy AsyncSession is
    not safe to use concurrently across tasks.
    """
    from backend.core.database.models.community import CommunityRecruitmentStatus
    from backend.modules.announcements.schemas import AnnouncementsBundleResponse
    from backend.modules.campuscurrent.communities.service import CommunityService
    from backend.modules.campuscurrent.events.service import EventService
    from backend.modules.campuscurrent.events import schemas as event_schemas

    community_service = CommunityService(db_session=db_session)
    event_service = EventService(db_session=db_session)

    photo_albums = await community_service.list_all_photo_albums(
        size=photo_albums_size,
        page=photo_albums_page,
        album_type=None,
    )

    communities = await community_service.list_communities(
        infra=infra,
        user=user,
        page=communities_page,
        size=communities_size,
        community_type=None,
        community_category=None,
        recruitment_status=CommunityRecruitmentStatus.open,
        head_sub=None,
        keyword=None,
    )

    event_filter = event_schemas.EventFilter(
        page=events_page,
        size=events_size,
        event_status=event_schemas.EventStatus.approved,
        time_filter=event_schemas.TimeFilter.UPCOMING,
    )
    events = await event_service.get_events(user=user, event_filter=event_filter, infra=infra)

    return AnnouncementsBundleResponse(
        photo_albums=photo_albums,
        communities=communities,
        events=events,
    )