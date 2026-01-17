from fastapi import HTTPException, status as http_status

from backend.core.database.models.sgotinish import (
    PermissionType,
    Ticket,
    TicketAccess,
)
from backend.core.database.models.user import User, UserRole
from backend.modules.sgotinish.base import BasePolicy
from backend.common.schemas import ResourcePermissions
from backend.modules.sgotinish.tickets import schemas


def _get_highest_permission(
    access_list: list[TicketAccess] | None,
) -> PermissionType | None:
    if not access_list:
        return None
    permissions = {access.permission for access in access_list}
    if PermissionType.DELEGATE in permissions:
        return PermissionType.DELEGATE
    if PermissionType.ASSIGN in permissions:
        return PermissionType.ASSIGN
    if PermissionType.VIEW in permissions:
        return PermissionType.VIEW
    return None


class TicketPolicy(BasePolicy):
    """Permissions for Ticket resources."""

    def check_read_sg_members(self):
        """Check if user can read the list of SG members."""
        allowed_roles = [
            UserRole.admin,
            UserRole.boss,
            UserRole.capo,
            UserRole.soldier,
        ]
        user_role_value = self.user_creds[1].get("role")
        if user_role_value and UserRole(user_role_value) in allowed_roles:
            return

        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this resource.",
        )

    def check_read_list(self, author_sub: str | None = None):
        """
        Any authenticated user can attempt to list tickets.
        The service layer will filter the tickets based on the user's role and permissions.
        """
        if self.is_admin:
            return

        if author_sub in ("me", self.user_sub):
            return

        if author_sub is None:
            return

        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this resource.",
        )

    def check_read_one(
        self,
        ticket: Ticket,
        access: TicketAccess | None,
        owner_hash_match: bool = False,
    ):
        """Check if user can read a specific ticket."""
        if self.is_admin or self._is_owner(ticket.author_sub) or owner_hash_match:
            return

        # Hierarchical check: DELEGATE includes ASSIGN, which includes VIEW.
        if access and access.permission in [
            PermissionType.VIEW,
            PermissionType.ASSIGN,
            PermissionType.DELEGATE,
        ]:
            return

        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND, detail="Ticket not found"
        )

    def check_create(self, ticket_data: schemas.TicketCreateDTO):
        """Check if user can create a ticket."""
        if self.is_admin:
            return

        if ticket_data.is_anonymous:
            if ticket_data.author_sub not in ("me", self.user_sub, None):
                raise HTTPException(
                    status_code=http_status.HTTP_403_FORBIDDEN,
                    detail="You can only create tickets for yourself.",
                )
            return

        if ticket_data.author_sub not in ("me", self.user_sub):
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="You can only create tickets for yourself.",
            )

    def check_update(self, ticket: Ticket, access: TicketAccess | None):
        """Check if user can update a ticket."""
        if self.is_admin:
            return

        if access and access.permission in [
            PermissionType.ASSIGN,
            PermissionType.DELEGATE,
        ]:
            return

        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this ticket.",
        )

    def check_delegate(self, target_user: User, user_access: TicketAccess | None):
        """Check if the current user can delegate access to the target user."""
        # 1. User must have DELEGATE permission on this ticket.
        user_department_id = self.user_creds[1]["department_id"]
        if not self.is_admin and (
            not user_access or user_access.permission != PermissionType.DELEGATE
        ):
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delegate access for this ticket.",
            )

        # 2. Enforce hierarchy rules
        if self.user_role == UserRole.boss.value or self.is_admin:
            return  # Boss/Admin can delegate to anyone

        if self.user_role == UserRole.capo.value:
            if target_user.role != UserRole.soldier.value:
                raise HTTPException(
                    status_code=http_status.HTTP_403_FORBIDDEN,
                    detail="Capos can only delegate to Soldiers.",
                )
            if target_user.department_id != user_department_id:
                raise HTTPException(
                    status_code=http_status.HTTP_403_FORBIDDEN,
                    detail="You can only delegate to Soldiers within your own department.",
                )
            return

        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delegate.",
        )

    def get_permissions(
        self, ticket: Ticket, access_list: list[TicketAccess] | None
    ) -> ResourcePermissions:
        """
        Determines ticket permissions for a user based on their role and the ticket state.
        This function MUST NOT perform any database operations.
        """
        permissions = ResourcePermissions()
        if self.is_admin:
            permissions.can_edit = True
            permissions.can_delete = False
            permissions.editable_fields = [
                "status"
            ]
            return permissions

        # Get the highest permission level from the user's access records
        highest_permission = _get_highest_permission(access_list)

        # Permissions based on ownership
        if self._is_owner(ticket.author_sub):
            permissions.can_edit = True
            permissions.can_delete = False
            permissions.editable_fields = []

        # Permissions based on explicit access grant
        if highest_permission:
            permissions.can_edit = True
            if highest_permission == PermissionType.DELEGATE:
                permissions.editable_fields = ["status"]
                # Potentially more fields for DELEGATE if needed in future
            elif highest_permission == PermissionType.ASSIGN:
                permissions.editable_fields = ["status"]

        # Remove duplicates
        if permissions.editable_fields:
            permissions.editable_fields = sorted(list(set(permissions.editable_fields)))

        return permissions


