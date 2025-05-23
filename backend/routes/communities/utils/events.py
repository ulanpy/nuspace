from typing import List

from backend.common.schemas import MediaResponse
from backend.core.database.models.community import CommunityEvent
from backend.routes.communities.schemas.events import CommunityEventResponseSchema


def build_event_response(
    event: CommunityEvent,
    media_responses: List[MediaResponse],
) -> CommunityEventResponseSchema:
    """
    Build a CommunityEventResponseSchema from a CommunityEvent ORM object and media responses.

    Parameters:
    - event (CommunityEvent): CommunityEvent ORM object with any needed relationships
    - media_responses (List[MediaResponse]): List of media response objects

    Returns:
    - CommunityEventResponseSchema: Formatted event response with all required fields
    """
    return CommunityEventResponseSchema(
        id=event.id,
        community_id=event.community_id,
        user_name=event.creator.name,
        user_surname=event.creator.surname,
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
        media=media_responses,
    )
