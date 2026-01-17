from backend.common.schemas import ResourcePermissions
from backend.core.database.models.sgotinish import (
    Conversation,
    Message,
    PermissionType,
    TicketAccess,
)
from backend.modules.sgotinish.base import BasePolicy
from backend.modules.sgotinish.messages import schemas
from fastapi import HTTPException
from fastapi import status as http_status


class MessagePolicy(BasePolicy):
    """Permissions for Message resources."""

    def check_read_list(
        self,
        conversation: Conversation,
        access: TicketAccess | None = None,
        owner_hash_match: bool = False,
    ):
        """Check if user can list messages in a conversation."""
        if self.is_admin:
            return

        # Check if user is the ticket author
        if conversation.ticket and (self._is_owner(conversation.ticket.author_sub) or owner_hash_match):
            return

        # Check if user has at least VIEW permission on the ticket
        if access and access.permission in [
            PermissionType.VIEW,
            PermissionType.ASSIGN,
            PermissionType.DELEGATE,
        ]:
            return

        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )

    def check_read_one(
        self,
        message: Message,
        access: TicketAccess | None = None,
        owner_hash_match: bool = False,
    ):
        """Check if user can read a specific message."""
        if self.is_admin:
            return

        # Check if user is the ticket author
        if (
            message.conversation
            and message.conversation.ticket
            and (
                self._is_owner(message.conversation.ticket.author_sub) or owner_hash_match
            )
        ):
            return

        # Check if user has at least VIEW permission on the ticket
        if access and access.permission in [
            PermissionType.VIEW,
            PermissionType.ASSIGN,
            PermissionType.DELEGATE,
        ]:
            return

        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Message not found")

    def check_create(
        self,
        conversation: Conversation,
        access: TicketAccess | None = None,
        owner_hash_match: bool = False,
    ):
        """
        Check if user can create a message in a conversation.
        SG member with Assign or Delegate permission can send messages.
        """
        if self.is_admin:
            return

        # Check if user is the ticket author
        is_ticket_author = conversation.ticket and (
            self._is_owner(conversation.ticket.author_sub) or owner_hash_match
        )

        if not (is_ticket_author or (access and access.permission in [
            PermissionType.ASSIGN,
            PermissionType.DELEGATE,
        ])):
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Message not found")


    def get_permissions(self, message: Message) -> ResourcePermissions:
        """
        Determines message permissions for a user.
        This function MUST NOT perform any database operations.
        """
        permissions = ResourcePermissions()

        if self.is_admin:
            permissions.can_edit = False
            permissions.can_delete = False
            permissions.editable_fields = []
            return permissions

        if self._is_owner(message.sender_sub):
            permissions.can_edit = False
            permissions.can_delete = False
            permissions.editable_fields = []

        return permissions
