import logging
import re
from typing import Optional

import httpx

from backend.modules.announcements import schemas
from backend.modules.announcements.interfaces import CommunityCatalog, EventCatalog
from backend.modules.campuscurrent.events import schemas as event_schemas
from backend.modules.campuscurrent.models.community import CommunityRecruitmentStatus

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

            return int(matches[-1])

    except Exception as e:
        logger.error(f"Failed to fetch telegram posts: {e}")
        return None


class AnnouncementsService:
    def __init__(
        self,
        community_catalog: CommunityCatalog,
        event_catalog: EventCatalog,
    ):
        self.community_catalog = community_catalog
        self.event_catalog = event_catalog

    async def get_bundle(
        self,
        *,
        infra,
        user: tuple[dict, dict],
        communities_page: int = 1,
        communities_size: int = 5,
        events_page: int = 1,
        events_size: int = 5,
    ) -> schemas.AnnouncementsBundleResponse:
        """
        Aggregate data required by the announcements landing page into a single response.

        NOTE: We intentionally run these sequentially because SQLAlchemy AsyncSession is
        not safe to use concurrently across tasks.
        """
        communities = await self.community_catalog.list_communities(
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
        events = await self.event_catalog.get_events(
            user=user, event_filter=event_filter, infra=infra
        )

        return schemas.AnnouncementsBundleResponse(
            communities=communities,
            events=events,
        )
