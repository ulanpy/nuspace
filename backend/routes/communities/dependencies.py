from typing import Annotated

from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import check_role, check_token, get_db_session
from backend.core.database.models.community import Community, EventStatus, EventTag
from backend.core.database.models.user import UserRole
from backend.routes.communities.schemas import CommunityEventRequestSchema


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
