from fastapi import HTTPException, status

from backend.modules.google_bucket.interfaces import (
    EventMediaUploadAccess,
    MediaUploadAuthorizer,
    PageMediaUploadAccess,
)
from backend.modules.media.models import PROFILE_MEDIA_ENTITY_ID, EntityType


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
        if entity_type == EntityType.users:
            # A person's own picture or banner. There is no row to authorize
            # against: the target is the signed-in user, and the object name
            # carries their `sub`.
            if entity_id != PROFILE_MEDIA_ENTITY_ID or count > 1:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Profile uploads take one file for your own account",
                )
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Media uploads are not supported for this resource type",
        )
