from fastapi import HTTPException, status

from backend.common.utils.enums import ResourceAction
from backend.core.database.models import Event, EventScope, EventStatus
from backend.core.database.models.user import UserRole
from backend.routes.campuscurrent.events.schemas import EventCreateRequest, EventUpdateRequest


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

    def __init__(self, user: tuple[dict, dict]):
        self.user = user

    async def _check_create_permissions(
        self,
        event_data: EventCreateRequest,
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

        if event_data.creator_sub != "me" and event_data.creator_sub != self.user[0].get("sub"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create events for yourself",
            )

        return

    async def _check_event_access(self, event: Event) -> bool:
        """
        Resource-based authorization: Check if user can access this specific event.

        Rules:
        - Admin can access any event
        - Users can always access their created events
        - Community heads can access all events in their communities
        - For other users:
          - Can only access approved or cancelled events for others' personal/community events
        """
        user_sub = self.user[0]["sub"]
        user_communities = self.user[1]["communities"]

        # If user is the creator
        if event.creator_sub == user_sub:
            return True

        # If it's a community event and user is the head
        if event.scope == EventScope.community and event.community_id in user_communities:
            return True

        # For all other cases, only show approved or cancelled events
        if event.status not in {EventStatus.approved, EventStatus.cancelled}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view approved or cancelled events",
            )

        return True

    async def _check_listing_permission(
        self,
        creator_sub: str | None = None,
        event_status: EventStatus | None = None,
        community_id: int | None = None,
        event_scope: EventScope | None = None,
    ) -> bool:
        """
        Intent-based authorization: Check if user can request events with these filters.

        Rules:
        - Admin can request any events without restrictions
        - Users can always request their own events without restrictions
        - Community heads can request all events in their communities without restrictions
        - For other users viewing events they don't own:
          - Must explicitly specify status in {approved, cancelled}
          - Cannot view events with other statuses

        Examples:
        - GET /events (own events) → All statuses allowed
        - GET /events (others' events) → Must specify status=approved or status=cancelled
        - GET /events?status=approved → Allowed
        - GET /events?status=cancelled → Allowed
        - GET /events?status=pending → Not allowed

        Note:
        - When status is not specified, it means user wants to see all statuses
        - Regular users must explicitly request approved events when viewing others' events
        - No silent filtering is applied - user must be explicit about their intent
        """
        user_sub = self.user[0]["sub"]
        user_communities = self.user[1]["communities"]

        # If requesting own events
        if creator_sub == "me" or creator_sub == user_sub:
            return True

        # If requesting community events and user is head
        if event_scope == EventScope.community and community_id in user_communities:
            return True

        # For all other cases, only allow approved or cancelled events
        if event_status not in {EventStatus.approved, EventStatus.cancelled}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view approved or cancelled events",
            )

        return True

    async def _check_update_permissions(
        self,
        event: Event,
        event_data: EventUpdateRequest,
    ) -> None:
        """
        Checks if the user has permission to update specific event fields.

        Permission rules:
        - Admin can update any field
        - Community head can update any field except: community_id, creator_sub, scope, tag
        - Personal event creator can update any field except: community_id, creator_sub, scope, tag
        - Community event creator can update any field except:
            community_id, creator_sub, scope, tag, status

        Raises:
            HTTPException: If the user doesn't have required permissions
        """
        user_communities = self.user[1]["communities"]

        # Check if any restricted fields are being updated
        restricted_fields = {
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
            if event.creator_sub != self.user[0]["sub"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only update your own events",
                )

    async def check_permission(
        self,
        action: ResourceAction,
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
            event_status: Optional status filter for read operations
            community_id: Optional community_id for filtering events
            event_scope: Optional scope filter for read operations

        Raises:
            HTTPException: If the user doesn't have permission or data is invalid
        """
        user_role = self.user[1]["role"]
        user_sub = self.user[0]["sub"]
        user_communities = self.user[1]["communities"]

        # Admin can do everything
        if user_role == UserRole.admin.value:
            return True

        if action == ResourceAction.CREATE:
            await self._check_create_permissions(event_data)
            return True

        elif action == ResourceAction.READ:
            if event:
                # Resource-based authorization (single event)
                return await self._check_event_access(event)
            else:
                # Intent-based authorization (listing)
                return await self._check_listing_permission(
                    creator_sub, event_status, community_id, event_scope
                )

        elif action == ResourceAction.UPDATE:
            await self._check_update_permissions(event, event_data)

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
