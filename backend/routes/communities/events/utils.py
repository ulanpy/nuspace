from typing import List

from backend.common.schemas import MediaResponse, ShortUserResponse
from backend.core.database.models import Event
from backend.routes.communities.communities.schemas import ShortCommunityResponseSchema
from backend.routes.communities.events.schemas import EventResponseSchema


def build_event_response(
    event: Event,
    event_media_responses: List[MediaResponse] = [],
    community_media_responses: List[MediaResponse] = [],
) -> EventResponseSchema:
    """
    Build a CommunityEventResponseSchema from a CommunityEvent ORM object and media responses.

    Parameters:
    - event (CommunityEvent): CommunityEvent ORM object with any needed relationships
    - event_media_responses (List[MediaResponse]): List of event media response objects
    - community_media_responses (List[MediaResponse]): List of community media response objects

    Returns:
    - CommunityEventResponseSchema: Formatted event response with all required fields
    """
    return EventResponseSchema(
        id=event.id,
        community=(
            ShortCommunityResponseSchema(
                id=event.community_id,
                name=event.community.name,
                description=event.community.description,
                media=community_media_responses,
            )
            if event.community_id
            else None
        ),
        creator=ShortUserResponse(
            sub=event.creator.sub,
            name=event.creator.name,
            surname=event.creator.surname,
            picture=event.creator.picture,
        ),
        policy=event.policy,
        scope=event.scope,
        type=event.type,
        tag=event.tag,
        name=event.name,
        place=event.place,
        event_datetime=event.event_datetime,
        description=event.description,
        duration=event.duration,
        status=event.status,
        created_at=event.created_at,
        updated_at=event.updated_at,
        media=event_media_responses,
    )
