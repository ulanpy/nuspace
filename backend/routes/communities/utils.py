from typing import List

from backend.common.schemas import MediaResponse
from backend.core.database.models import Community
from backend.core.database.models.community import CommunityEvent
from backend.routes.communities.schemas import CommunityEventResponseSchema, CommunityResponseSchema


def build_community_response(
    community: Community,
    media_responses: List[MediaResponse],
) -> CommunityResponseSchema:
    """
    Build a CommunityResponseSchema from a Community ORM object and media responses.

    Parameters:
    - community (Community): Community ORM object with loaded head_user relationship
    - media_responses (List[MediaResponse]): List of media response objects

    Returns:
    - CommunityResponseSchema: Formatted community response with all required fields
    """
    return CommunityResponseSchema(
        id=community.id,
        name=community.name,
        type=community.type,
        category=community.category,
        recruitment_status=community.recruitment_status,
        description=community.description,
        established=community.established,
        user_name=community.head_user.name,
        user_surname=community.head_user.surname,
        telegram_url=community.telegram_url,
        instagram_url=community.instagram_url,
        created_at=community.created_at,
        updated_at=community.updated_at,
        media=media_responses,
    )


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
