from enum import Enum
from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import check_role, check_token, get_db_session
from backend.core.database.models import Community, Event, EventStatus, EventTag
from backend.core.database.models.user import UserRole
from backend.routes.communities.events.schemas import EventRequest


class EventAction(str, Enum):
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"


class EventPolicy:
    """
    Event policy class for centralized permission checking and data validation.

    **Note**
    When extending this class, keep in mind that it should only handle permission checking
    and data validation. All other logic should be kept outside of this class.
    """

    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def _get_event(self, event_id: int) -> Optional[Event]:
        """Helper method to fetch event"""
        qb = QueryBuilder(session=self.db_session, model=Event)
        return await qb.base().filter(Event.id == event_id).eager(Event.community).first()

    async def _is_community_head(self, user_sub: str, community_id: int) -> bool:
        """Helper method to check if user is head of community"""
        qb = QueryBuilder(session=self.db_session, model=Community)
        community = await qb.base().filter(Community.id == community_id).first()
        return community is not None and community.head_user.sub == user_sub

    async def _validate_event_status(
        self,
        event_data: EventRequest,
        user: dict,
        user_role: UserRole,
    ) -> None:
        """
        Validates event status based on user role and event type.
        Raises HTTPException if status is invalid.

        Rules:
        - Admin can set any status and tag
        - For personal events (no community_id):
          - Status must be personal
        - For community events (has community_id):
          - If user is head -> status must be approved
          - If not head -> status must be pending
        - Non-admin users can only use regular tag
        """
        # Admin can set any status and tag
        if user_role == UserRole.admin:
            return

        # Non-admin users can only use regular tag
        if event_data.tag is not EventTag.regular:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Non admin users cannot set EventTag other than regular",
            )

        # For personal events
        if not event_data.community_id:
            if event_data.status != EventStatus.personal:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Must set EventStatus.personal if community_id is not provided",
                )
            return

        # For community events
        is_head = await self._is_community_head(user["sub"], event_data.community_id)

        if is_head:
            if event_data.status != EventStatus.approved:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Must set EventStatus.approved if user is community head",
                )
        else:
            if event_data.status != EventStatus.pending:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Must set EventStatus.pending if user is NOT community head",
                )

    async def check_permission(
        self,
        action: EventAction,
        user: dict,
        user_role: UserRole,
        event_id: Optional[int] = None,
        community_id: Optional[int] = None,
        event_data: Optional[EventRequest] = None,
    ) -> bool:
        """
        Centralized permission checking and data validation for event actions.

        Args:
            action: The action being performed
            user: The user performing the action
            user_role: The role of the user
            event_id: Optional event ID for actions that require it
            community_id: Optional community ID for create actions
            event_data: Optional event data for create/update actions

        Raises:
            HTTPException: If the user doesn't have permission or data is invalid
        """

        # Admin can do everything
        if user_role == UserRole.admin:
            if action in [EventAction.CREATE, EventAction.UPDATE] and event_data:
                # Still validate admin's event data
                await self._validate_event_status(event_data, user, user_role)
            return True

        if action == EventAction.CREATE:
            if not event_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Event data required for create action",
                )

            # Validate event status and tag
            await self._validate_event_status(event_data, user, user_role)

            # For personal events (no community_id), any user can create
            if not community_id:
                return True

            # For community events, non-head users can create events (they'll be pending)
            return True

        elif action == EventAction.READ:
            # All authenticated users can read
            return True

        elif action == EventAction.UPDATE:
            if not event_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail="Event ID required for update"
                )

            if not event_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Event data required for update action",
                )

            event = await self._get_event(event_id)
            if not event:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

            # Validate event status and tag
            await self._validate_event_status(event_data, user, user_role)

            # Creator can update their own event
            if event.creator_sub == user["sub"]:
                return True

            # Community head can update events in their community
            if event.community_id:
                is_head = await self._is_community_head(user["sub"], event.community_id)
                if is_head:
                    return True

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only event creator, community head, or admin can update events",
            )

        elif action == EventAction.DELETE:
            if not event_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail="Event ID required for delete"
                )

            event = await self._get_event(event_id)
            if not event:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

            # Creator can delete their own event
            if event.creator_sub == user["sub"]:
                return True

            # Community head can delete events in their community
            if event.community_id:
                is_head = await self._is_community_head(user["sub"], event.community_id)
                if is_head:
                    return True

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only event creator, community head, or admin can delete events",
            )

        # This should never happen as we've handled all enum cases
        raise ValueError(f"Unhandled action type: {action}")


# Dependency functions for different actions
async def get_event_policy(
    db_session: AsyncSession = Depends(get_db_session),
) -> EventPolicy:
    return EventPolicy(db_session)


async def check_create_permission(
    event_data: EventRequest,
    user: Annotated[dict, Depends(check_token)],
    role: Annotated[UserRole, Depends(check_role)],
    policy: Annotated[EventPolicy, Depends(get_event_policy)],
) -> dict:
    await policy.check_permission(
        EventAction.CREATE, user, role, community_id=event_data.community_id, event_data=event_data
    )
    return user


async def check_read_permission(
    user: Annotated[dict, Depends(check_token)],
    role: Annotated[UserRole, Depends(check_role)],
    policy: Annotated[EventPolicy, Depends(get_event_policy)],
) -> dict:
    await policy.check_permission(EventAction.READ, user, role)
    return user


async def check_update_permission(
    event_id: int,
    event_data: EventRequest,
    user: Annotated[dict, Depends(check_token)],
    role: Annotated[UserRole, Depends(check_role)],
    policy: Annotated[EventPolicy, Depends(get_event_policy)],
) -> dict:
    await policy.check_permission(
        EventAction.UPDATE, user, role, event_id=event_id, event_data=event_data
    )
    return user


async def check_delete_permission(
    event_id: int,
    user: Annotated[dict, Depends(check_token)],
    role: Annotated[UserRole, Depends(check_role)],
    policy: Annotated[EventPolicy, Depends(get_event_policy)],
) -> dict:
    await policy.check_permission(EventAction.DELETE, user, role, event_id=event_id)
    return user
