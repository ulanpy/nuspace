from fastapi import HTTPException, status

from backend.modules.google_bucket.interfaces import (
    CommunityMediaUploadAccess,
    EventMediaUploadAccess,
    MediaUploadAuthorizer,
    UserMediaUploadAccess,
)
from backend.modules.media.models import EntityType


class BucketMediaUploadAuthorizer(MediaUploadAuthorizer):
    """Adapts Campus Current resource policies for bucket upload authorization."""

    def __init__(
        self,
        *,
        events: EventMediaUploadAccess,
        communities: CommunityMediaUploadAccess,
        users: UserMediaUploadAccess,
    ) -> None:
        self._events = events
        self._communities = communities
        self._users = users

    async def authorize_media_upload(
        self,
        *,
        entity_type: EntityType,
        entity_id: int,
        user: tuple[dict, dict],
    ) -> None:
        if entity_type == EntityType.community_events:
            await self._events.authorize_media_upload(entity_id, user)
            return
        if entity_type == EntityType.communities:
            await self._communities.authorize_media_upload(entity_id, user)
            return
        if entity_type == EntityType.users:
            await self._users.authorize_user_media_upload(entity_id, user)
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Media uploads are not supported for this resource type",
        )
