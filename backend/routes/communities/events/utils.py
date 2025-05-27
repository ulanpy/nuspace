from typing import List

from backend.common.schemas import MediaResponse
from backend.core.database.models.community import CommunityEvent
from backend.routes.communities.communities.schemas import ShortCommunityResponseSchema
from backend.routes.communities.events.schemas import CommunityEventResponseSchema


def build_event_response(
    event: CommunityEvent,
    event_media_responses: List[MediaResponse] | None = None,
    community_media_responses: List[MediaResponse] | None = None,
) -> CommunityEventResponseSchema:
    """
    Build a CommunityEventResponseSchema from a CommunityEvent ORM object and media responses.

    Parameters:
    - event (CommunityEvent): CommunityEvent ORM object with any needed relationships
    - event_media_responses (List[MediaResponse]): List of event media response objects
    - community_media_responses (List[MediaResponse]): List of community media response objects

    Returns:
    - CommunityEventResponseSchema: Formatted event response with all required fields
    """
    return CommunityEventResponseSchema(
        id=event.id,
        community=ShortCommunityResponseSchema(
            id=event.community_id,
            name=event.community.name,
            description=event.community.description,
            media=community_media_responses,
        ),
        creator_name=event.creator.name,
        creator_surname=event.creator.surname,
        policy=event.policy,
        name=event.name,
        place=event.place,
        event_datetime=event.event_datetime,
        description=event.description,
        duration=event.duration,
        status=event.status,
        tag=event.tag,
        created_at=event.created_at,
        updated_at=event.updated_at,
        media=event_media_responses,
    )
