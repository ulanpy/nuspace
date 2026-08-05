import logging
import re
from typing import Optional

import httpx

from backend.modules.announcements import schemas
from backend.modules.announcements.interfaces import EventCatalog
from backend.modules.campuscurrent.events import schemas as event_schemas
from backend.modules.campuscurrent.models.events import EventType

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
    def __init__(self, event_catalog: EventCatalog):
        self.event_catalog = event_catalog

    async def get_bundle(
        self,
        *,
        infra,
        user: tuple[dict, dict],
        events_page: int = 1,
        events_size: int = 11,
        recruitment_events_page: int = 1,
        recruitment_events_size: int = 5,
    ) -> schemas.AnnouncementsBundleResponse:
        """
        Aggregate data required by the announcements landing page into a single response.

        NOTE: We intentionally run these sequentially because SQLAlchemy AsyncSession is
        not safe to use concurrently across tasks.
        """
        event_filter = event_schemas.EventFilter(
            page=events_page,
            size=events_size,
            event_status=event_schemas.EventStatus.approved,
            time_filter=event_schemas.TimeFilter.UPCOMING,
        )
        events = await self.event_catalog.get_events(
            user=user, event_filter=event_filter, infra=infra
        )

        recruitment_filter = event_schemas.EventFilter(
            page=recruitment_events_page,
            size=recruitment_events_size,
            event_status=event_schemas.EventStatus.approved,
            event_type=EventType.recruitment,
            time_filter=event_schemas.TimeFilter.UPCOMING,
        )
        recruitment_events = await self.event_catalog.get_events(
            user=user, event_filter=recruitment_filter, infra=infra
        )

        return schemas.AnnouncementsBundleResponse(
            events=events,
            recruitment_events=recruitment_events,
        )
