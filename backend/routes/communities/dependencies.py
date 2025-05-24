from datetime import date, datetime
from typing import Annotated, Any, List

from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import check_role, check_token, get_db_session
from backend.core.database.models.community import (
    Community,
    CommunityComment,
    CommunityEvent,
    EventStatus,
    EventTag,
)
from backend.core.database.models.user import UserRole
from backend.routes.communities.schemas.events import CommunityEventRequestSchema


async def mutate_event_status(
    event_data: CommunityEventRequestSchema,
    user: Annotated[dict, Depends(check_token)],
    role: Annotated[bool, Depends(check_role)],
    db_session: AsyncSession = Depends(get_db_session),
) -> CommunityEventRequestSchema:
    """
    Dependency that mutates event status based on user role and community head status.

    - If user is admin -> no mutation
    - If no community_id -> personal event
    - If community_id provided:
        - If user is head -> approved
        - If not head -> pending
    - Always sets tag to regular for non-admin users
    """
    # Skip mutation for admin users
    if role == UserRole.admin:
        return event_data

    # Set tag to regular for non-admin users
    event_data.tag = EventTag.regular

    # If no community_id, it's a personal event
    if not event_data.community_id:
        event_data.status = EventStatus.personal
        return event_data

    # Check if community exists and get head info
    qb = QueryBuilder(session=db_session, model=Community)
    community: Community | None = (
        await qb.base()
        .filter(Community.id == event_data.community_id)
        .eager(Community.head_user)
        .first()
    )

    if community is None:
        raise HTTPException(status_code=404, detail="Community not found")

    # Set status based on whether user is head
    if community.head_user.sub == user["sub"]:
        event_data.status = EventStatus.approved
    else:
        event_data.status = EventStatus.pending

    return event_data


async def check_comment_ownership(
    comment_id: int,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
) -> bool:
    qb = QueryBuilder(session=db_session, model=CommunityComment)
    comment: CommunityComment | None = (
        await qb.base().filter(CommunityComment.id == comment_id).first()
    )

    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.user_sub != user["sub"]:
        raise HTTPException(status_code=403, detail="You are not the owner of this comment")
    return True


async def get_date_conditions(
    start_date: date | None = None,
    end_date: date | None = None,
) -> List[Any]:
    """
    Dependency that generates date-based conditions for event queries.

    Args:
        start_date: Optional start date for filtering events
        end_date: Optional end date for filtering events

    Returns:
        List of SQLAlchemy conditions for date filtering

    Raises:
        HTTPException: If end_date is before start_date
    """
    conditions = []

    if start_date and end_date:
        if end_date < start_date:
            raise HTTPException(status_code=400, detail="End date must be after start date")
        start = datetime.combine(start_date, datetime.min.time())
        end = datetime.combine(end_date, datetime.max.time())
        conditions.append(CommunityEvent.event_datetime.between(start, end))
    elif start_date:
        start = datetime.combine(start_date, datetime.min.time())
        conditions.append(CommunityEvent.event_datetime >= start)
    elif end_date:
        end = datetime.combine(end_date, datetime.max.time())
        conditions.append(CommunityEvent.event_datetime <= end)

    return conditions


async def can_edit_event(
    event_id: int,
    user: Annotated[dict, Depends(check_token)],
    role: Annotated[UserRole, Depends(check_role)],
    db_session: AsyncSession = Depends(get_db_session),
) -> CommunityEvent:
    """
    Dependency that checks if a user can edit an event.

    - Default users can only fetch their own events
    - Admins can edit any event
    - Community heads can edit any event in their community
    """
    qb = QueryBuilder(session=db_session, model=CommunityEvent)

    # Default users can only fetch their own events
    filters = [CommunityEvent.id == event_id]
    if role == UserRole.default:
        filters.append(CommunityEvent.creator_sub == user["sub"])

    event: CommunityEvent | None = (
        await qb.base().filter(*filters).eager(CommunityEvent.community).first()
    )

    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Additional access control for head and admin
    is_admin = role == UserRole.admin
    is_head = event.community.head == user["sub"]
    is_creator = event.creator_sub == user["sub"]

    if not (is_admin or is_head or is_creator):
        raise HTTPException(status_code=403, detail="You don't have permission to edit this event")

    return event
