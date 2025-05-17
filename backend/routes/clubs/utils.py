from typing import List

from backend.common.schemas import MediaResponse
from backend.core.database.models import Club
from backend.core.database.models.club import ClubEvent
from backend.routes.clubs.schemas import ClubEventResponseSchema, ClubResponseSchema


async def build_club_response(
    club: Club,
    media_responses: List[MediaResponse],
) -> ClubResponseSchema:
    """
    Build a ClubResponseSchema from a Club ORM object and media responses.

    Parameters:
    - club (Club): Club ORM object with loaded president relationship
    - media_responses (List[MediaResponse]): List of media response objects

    Returns:
    - ClubResponseSchema: Formatted club response with all required fields
    """
    return ClubResponseSchema(
        id=club.id,
        name=club.name,
        type=club.type,
        description=club.description,
        president=club.president,
        telegram_url=club.telegram_url,
        instagram_url=club.instagram_url,
        created_at=club.created_at,
        updated_at=club.updated_at,
        media=media_responses,
    )


async def build_event_response(
    event: ClubEvent,
    media_responses: List[MediaResponse],
) -> ClubEventResponseSchema:
    """
    Build a ClubEventResponseSchema from a ClubEvent ORM object and media responses.

    Parameters:
    - event (ClubEvent): ClubEvent ORM object with any needed relationships
    - media_responses (List[MediaResponse]): List of media response objects

    Returns:
    - ClubEventResponseSchema: Formatted event response with all required fields
    """
    return ClubEventResponseSchema(
        id=event.id,
        club_id=event.club_id,
        name=event.name,
        place=event.place,
        description=event.description,
        duration=event.duration,
        event_datetime=event.event_datetime,
        policy=event.policy,
        created_at=event.created_at,
        updated_at=event.updated_at,
        media=media_responses,
    )
