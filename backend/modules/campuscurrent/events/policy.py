from fastapi import HTTPException, status

from backend.common.schemas import ResourcePermissions
from backend.modules.campuscurrent.base import BasePolicy
from backend.modules.campuscurrent.events.schemas import EventCreateRequest, EventUpdateRequest
from backend.modules.campuscurrent.models import Event, EventStatus


class EventPolicy(BasePolicy):
    """Event policy for permission checking and authorization control."""

    def check_create(self, event_data: EventCreateRequest) -> None:
        if self.is_admin:
            return

        if event_data.creator_sub not in ("me", self.user_sub):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create events for yourself",
            )

    def check_read_one(self, event: Event) -> None:
        if self.is_admin:
            return

        if self._is_owner(event.creator_sub):
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
    ) -> None:
        if self.is_admin:
            return

        if creator_sub in ("me", self.user_sub):
            return

        if event_status not in {EventStatus.approved, EventStatus.cancelled}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view approved or cancelled events",
            )

    def check_update(self, event: Event, event_data: EventUpdateRequest) -> None:
        if self.is_admin:
            return

        if not self._is_owner(event.creator_sub):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only event creator or admin can update events",
            )

        self._check_update_field_permissions(event_data)

    def _check_update_field_permissions(self, event_data: EventUpdateRequest) -> None:
        restricted_fields = ["tag"]
        for field in restricted_fields:
            if getattr(event_data, field) is not None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Field '{field}' cannot be modified by non-admin users",
                )

    def check_delete(self, event: Event) -> None:
        if self.is_admin:
            return

        if not self._is_owner(event.creator_sub):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only event creator or admin can delete events",
            )

    def check_rsvp(self, event: Event) -> None:
        """Authenticated users may RSVP on approved or cancelled events they can read."""
        self.check_read_one(event=event)

        if event.status not in {EventStatus.approved, EventStatus.cancelled}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only RSVP to approved or cancelled events",
            )

    def check_list_attendees(self, event: Event, *, is_viewer: bool = False) -> None:
        if self.is_admin:
            return

        if self._is_owner(event.creator_sub) or is_viewer:
            return

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only event creator, co-viewer, or admin can view attendees",
        )

    def check_share_access(self, event: Event) -> None:
        if self.is_admin:
            return

        if not self._is_owner(event.creator_sub):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only event creator or admin can share access",
            )

    def get_permissions(
        self, event: Event, *, is_attendee_viewer: bool = False
    ) -> ResourcePermissions:
        permissions = ResourcePermissions()

        if self.is_admin:
            permissions.can_edit = True
            permissions.can_delete = True
            permissions.can_view_attendees = True
            permissions.can_share_access = True
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

        if self._is_owner(event.creator_sub):
            permissions.can_edit = True
            permissions.can_delete = True
            permissions.can_view_attendees = True
            permissions.can_share_access = True
            permissions.editable_fields = [
                "name",
                "place",
                "start_datetime",
                "end_datetime",
                "description",
                "policy",
                "type",
                "registration_link",
                "status",
            ]
            return permissions

        if is_attendee_viewer:
            permissions.can_view_attendees = True

        return permissions
