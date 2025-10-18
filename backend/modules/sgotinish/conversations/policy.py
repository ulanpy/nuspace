from backend.common.schemas import ResourcePermissions
from backend.core.database.models.sgotinish import (
    Conversation,
    PermissionType,
    Ticket,
    TicketAccess,
)
from backend.modules.sgotinish.base import BasePolicy
from fastapi import HTTPException
from fastapi import status as http_status


class ConversationPolicy(BasePolicy):
    """Permissions for Conversation resources."""

    def check_create(self, ticket: Ticket, access: TicketAccess | None):
        """
        Check if a user can create a new conversation for a ticket.
        Only users with assignment or delegation rights can initiate a conversation.
        Only one conversation per ticket is possible.
        """
        if ticket.conversations:
            raise HTTPException(status_code=http_status.HTTP_409_CONFLICT, detail="Conversation already exists")

        if self.is_admin:
            return

        if access and access.permission in [
            PermissionType.ASSIGN,
            PermissionType.DELEGATE,
        ]:
            return

        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="You must have ASSIGN or DELEGATE permission to create a conversation.",
        )


    def check_update(self, access: TicketAccess | None):
        """Check if user can update a conversation."""
        if self.is_admin:
            return

        if access and access.permission in [
            PermissionType.ASSIGN,
            PermissionType.DELEGATE,
        ]:
            return

        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this conversation.",
        )

    def get_permissions(self, conversation: Conversation) -> ResourcePermissions:
        """
        Determines conversation permissions for a user.
        This function MUST NOT perform any database operations.
        """
        permissions = ResourcePermissions()

        if self.is_admin:
            permissions.can_edit = True
            permissions.can_delete = False
            permissions.editable_fields = ["status"]
            return permissions

        # SG members assigned to the conversation can edit the status
        if self.is_sg_member and self._is_owner(conversation.sg_member_sub):
            permissions.can_edit = True
            permissions.can_delete = False
            permissions.editable_fields = ["status"]

        return permissions
