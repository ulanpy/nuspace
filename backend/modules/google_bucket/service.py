from fastapi import HTTPException, status

from backend.modules.google_bucket.interfaces import (
    EventMediaUploadAccess,
    MediaUploadAuthorizer,
    PageMediaUploadAccess,
)
from backend.modules.media.models import EntityType


class BucketMediaUploadAuthorizer(MediaUploadAuthorizer):
    """Adapts Campus Current resource policies for bucket upload authorization."""

    def __init__(
        self,
        *,
        events: EventMediaUploadAccess,
        pages: PageMediaUploadAccess,
    ) -> None:
        self._events = events
        self._pages = pages

    async def authorize_media_upload(
        self,
        *,
        entity_type: EntityType,
        entity_id: int,
        user: tuple[dict, dict],
        count: int = 1,
    ) -> None:
        if entity_type == EntityType.community_events:
            await self._events.authorize_media_upload(entity_id, user, count)
            return
        if entity_type == EntityType.pages:
            await self._pages.authorize_media_upload(entity_id, user, count)
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Media uploads are not supported for this resource type",
        )
