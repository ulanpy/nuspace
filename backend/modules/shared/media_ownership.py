"""Ownership check for media deletion, shared by every entity that owns media.

A caller-supplied media id is a guess until the row is checked against the
entity being edited, otherwise anyone could pass someone else's media id and
have it deleted. Both the community and the user profile paths need this, and
neither of them owns the concept.
"""

from fastapi import HTTPException, status

from backend.modules.campuscurrent.communities.interfaces import MediaAttachmentResolver
from backend.modules.media.models import EntityType


async def delete_owned_media(
    media_attachment_resolver: MediaAttachmentResolver,
    media_ids: list[int],
    entity_type: EntityType,
    entity_id: int,
) -> None:
    media_objects = await media_attachment_resolver.list_by_ids(media_ids)

    found_ids = {media.id for media in media_objects}
    missing = set(media_ids) - found_ids
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Media not found: {sorted(missing)}",
        )

    for media in media_objects:
        if media.entity_type != entity_type or media.entity_id != entity_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Media does not belong to this entity",
            )

    await media_attachment_resolver.delete_many(media_objects)
