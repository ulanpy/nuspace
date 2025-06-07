from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.utils.enums import ResourceAction
from backend.core.database.models import Event, EventScope, EventStatus, EventTag
from backend.core.database.models.user import UserRole
from backend.routes.communities.events.schemas import EventCreateRequest, EventUpdateRequest


class EventPolicy:
    """
    Event policy class for centralized permission checking and authorization control.

    This class focuses exclusively on permission and authorization checks, such as:
    - Who can create, read, update, or delete events
    - What roles have access to specific actions
    - Special permissions for community heads and admins

    **Note**
    This class should NOT handle logical data validation (e.g., whether a personal event can have a
    community_id). Such validations belong in the schema layer as they represent fundamental
    data model rules that apply regardless of user permissions. This class should only determine
    WHO can perform actions, not WHAT makes valid event data.

    **Example of schema/logical validations**
    - Personal events cannot have a community_id
    - Community events must have a community_id
    - Event datetime must be in the future
    - Event duration must be positive
    - Event name must not be empty

    **Example of permission checks(this class)**
    - Only admins can create events
    - Only community heads can update event status
    - Only event creators can delete their own events

    """

    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def _check_create_permissions(
        self,
        event_data: EventCreateRequest,
        user: tuple[dict, dict],
    ) -> None:
        """
        Checks if the user has permission to create an event with the given configuration.

        Permission rules:
        - Admin can set any status and configuration
        - Non-admin users:
          - Can only use regular tag
          - For community events:
            - Must be head to set non-pending status

        Note: Resource existence (e.g. if community exists) should be checked at the service layer,
        not in the policy layer.

        Raises:
            HTTPException: If the user doesn't have required permissions
        """

        user_role = user[1]["role"]
        user_communities = user[1]["communities"]
        # Admin can set any status and configuration
        if user_role == UserRole.admin.value:
            return

        # Non-admin users can only use regular tag
        if event_data.tag is not EventTag.regular:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Non admin users cannot set EventTag other than regular",
            )

        if event_data.creator_sub != "me" and event_data.creator_sub != user[0].get("sub"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create events for yourself",
            )

        # Community scope permission checks
        if event_data.scope == EventScope.community:
            # Check if user is head of the community
            is_head: bool = event_data.community_id in user_communities

            if not is_head:
                if event_data.status != EventStatus.pending:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Non-head users must set status to "
                            f"{EventStatus.pending} for community events"
                        ),
                    )
            return

    async def _check_read_permissions(
        self,
        user: tuple[dict, dict],
        creator_sub: str | None = None,
        event_status: EventStatus | None = None,
        community_id: int | None = None,
        event_scope: EventScope | None = None,
    ) -> None:
        """
        Checks if the user has permission to read the event.

        Permission rules:
        - Admin can read any event
        - Users can always read their created events (when creator_sub = "me" or indicates their
            user_sub)
        - Community heads can read all events in their communities
        - For other users:
          - Can only read approved events for others' personal/community events

        Raises:
            HTTPException: If the user doesn't have required permissions
        """
        user_role = user[1]["role"]
        user_sub = user[0]["sub"]
        user_communities = user[1]["communities"]

        # Admin can read everything
        if user_role == UserRole.admin.value:
            return

        # If user is requesting their own events
        if creator_sub == "me" or creator_sub == user_sub:
            return

        # If it's a community event and user is the head
        if event_scope == EventScope.community and community_id in user_communities:
            return

        # For all other cases, only show approved events
        if event_status != EventStatus.approved:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view approved events",
            )

    async def _check_update_permissions(
        self,
        event: Event,
        event_data: EventUpdateRequest,
        user: tuple[dict, dict],
    ) -> None:
        """
        Checks if the user has permission to update specific event fields.

        Permission rules:
        - Admin can update any field
        - Community head can update any field except: community_id, creator_sub, scope, tag
        - Event creator can update any field except: community_id, creator_sub, scope, tag, status

        Raises:
            HTTPException: If the user doesn't have required permissions
        """
        user_role = user[1]["role"]
        user_communities = user[1]["communities"]
        # Admin can update anything
        if user_role == UserRole.admin.value:
            return

        # Check if any restricted fields are being updated
        restricted_fields = {
            "community_id": event.community_id,
            "creator_sub": event.creator_sub,
            "scope": event.scope,
            "tag": event.tag,
        }

        for field, original_value in restricted_fields.items():
            new_value = getattr(event_data, field, None)
            if new_value is not None and new_value != original_value:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Field '{field}' cannot be modified by non-admin users",
                )

        # For community events, validate status based on user role
        if event.scope == EventScope.community:
            is_head: bool = event.community_id in user_communities

            if not is_head:
                if event_data.status is not None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Non-head users cannot set status",
                    )

        elif event.scope == EventScope.personal:
            if event_data.status is not None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Non-head users cannot update status",
                )

    async def check_permission(
        self,
        action: ResourceAction,
        user: tuple[dict, dict],
        event: Event | None = None,
        event_data: EventCreateRequest | EventUpdateRequest | None = None,
        creator_sub: str | None = None,
        event_status: EventStatus | None = None,
        community_id: int | None = None,
        event_scope: EventScope | None = None,
    ) -> bool:
        """
        Centralized permission checking and data validation for event actions.

        Args:
            action: The action being performed
            user: The user performing the action
            event: Optional event object for update/delete/read actions
            event_data: Optional event data for create/update actions
            creator_sub: Optional creator_sub for filtering events (used in read operations)

        Raises:
            HTTPException: If the user doesn't have permission or data is invalid
        """
        user_role = user[1]["role"]
        user_sub = user[0]["sub"]
        user_communities = user[1]["communities"]

        # Admin can do everything
        if user_role == UserRole.admin.value:
            return True

        if action == ResourceAction.CREATE:
            await self._check_create_permissions(event_data, user)
            return True

        elif action == ResourceAction.READ:
            await self._check_read_permissions(
                user, creator_sub, event_status, community_id, event_scope
            )
            return True

        elif action == ResourceAction.UPDATE:
            await self._check_update_permissions(event, event_data, user)

            # Creator can update their own event
            if event.creator_sub == user_sub:
                return True

            # Community head can update events in their community
            if event.community_id:
                is_head: bool = event.community_id in user_communities
                if is_head:
                    return True

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only event creator, community head, or admin can update events",
            )

        elif action == ResourceAction.DELETE:
            # Creator can delete their own event
            if event.creator_sub == user_sub:
                return True

            # Community head can delete events in their community
            if event.community_id:
                is_head: bool = event.community_id in user_communities
                if is_head:
                    return True

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only event creator, community head, or admin can delete events",
            )

        # This should never happen as we've handled all enum cases
        raise ValueError(f"Unhandled action type: {action}")
