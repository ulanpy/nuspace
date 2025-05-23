from typing import List

from backend.common.schemas import MediaResponse
from backend.core.database.models.community import Community
from backend.routes.communities.schemas.communities import CommunityResponseSchema


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
