from fastapi import HTTPException, status

from backend.common.schemas import ResourcePermissions
from backend.core.database.models import Event, EventScope, EventStatus
from backend.routes.campuscurrent.base import BasePolicy
from backend.routes.campuscurrent.events.schemas import EventCreateRequest, EventUpdateRequest


class EventPolicy(BasePolicy):
    """
    Event policy class for centralized permission checking and authorization control.
    """

    def check_create(self, event_data: EventCreateRequest) -> None:
        """
        Checks if the user has permission to create an event with the given configuration.
        """
        if self.is_admin:
            return

        if event_data.creator_sub not in ("me", self.user_sub):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create events for yourself",
            )

    def check_read_one(self, event: Event) -> None:
        """
        Resource-based authorization: Check if user can access this specific event.
        """
        if self.is_admin:
            return

        if self._is_owner(event.creator_sub):
            return

        if event.scope == EventScope.community and self._is_community_head(event.community_id):
            return

        if event.status not in {EventStatus.approved, EventStatus.cancelled}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view approved or cancelled events",
            )

    def check_read_list(
        self,
        creator_sub: str | None = None,
        event_status: EventStatus | None = None,
        community_id: int | None = None,
        event_scope: EventScope | None = None,
    ) -> None:
        """
        Intent-based authorization: Check if user can request events with these filters.
        """
        if self.is_admin:
            return

        if creator_sub in ("me", self.user_sub):
            return

        if (
            event_scope == EventScope.community
            and community_id
            and self._is_community_head(community_id)
        ):
            return

        if event_status not in {EventStatus.approved, EventStatus.cancelled}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view approved or cancelled events",
            )

    def check_update(self, event: Event, event_data: EventUpdateRequest) -> None:
        """
        Checks if the user has permission to update specific event fields.
        """
        if self.is_admin:
            return

        # General authorization check
        can_update = self._is_owner(event.creator_sub) or (
            event.community_id and self._is_community_head(event.community_id)
        )
        if not can_update:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only event creator, community head, or admin can update events",
            )

        # Field-level permission checks
        self._check_update_field_permissions(event, event_data)

    def _check_update_field_permissions(self, event: Event, event_data: EventUpdateRequest) -> None:
        # Check for restricted fields for non-admins
        restricted_fields = ["tag"]
        for field in restricted_fields:
            if getattr(event_data, field) is not None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Field '{field}' cannot be modified by non-admin users",
                )

        # Status update permissions
        if event_data.status is not None:
            is_creator = self._is_owner(event.creator_sub)
            is_head = event.community_id and self._is_community_head(event.community_id)

            # Community event creator cannot change status
            if event.scope == EventScope.community and is_creator and not is_head:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Event creators cannot change the status of community events.",
                )

    def check_delete(self, event: Event) -> None:
        """
        Checks if the user has permission to delete the event.
        """
        if self.is_admin:
            return

        can_delete = self._is_owner(event.creator_sub) or (
            event.community_id and self._is_community_head(event.community_id)
        )

        if not can_delete:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only event creator, community head, or admin can delete events",
            )

    def get_permissions(self, event: Event) -> ResourcePermissions:
        """
        Determines event permissions for a user based on their role and the event state.
        """
        permissions = ResourcePermissions()

        if self.is_admin:
            permissions.can_edit = True
            permissions.can_delete = True
            permissions.editable_fields = [
                "name",
                "place",
                "start_datetime",
                "end_datetime",
                "description",
                "policy",
                "registration_link",
                "status",
                "type",
                "tag",
            ]
            return permissions

        is_creator = self._is_owner(event.creator_sub)
        is_head = False
        if event.community_id:
            is_head = self._is_community_head(event.community_id)

        permissions.can_delete = is_creator or (event.scope == EventScope.community and is_head)

        if is_creator or (event.scope == EventScope.community and is_head):
            permissions.can_edit = True
            permissions.editable_fields = [
                "name",
                "place",
                "start_datetime",
                "end_datetime",
                "description",
                "policy",
                "type",
                "registration_link",
            ]

            if is_head or (is_creator and event.scope == EventScope.personal):
                permissions.editable_fields.append("status")

        return permissions
