from backend.core.database.models.sgotinish import Conversation, Message, TicketAccess, PermissionType
from backend.routes.sgotinish.base import BasePolicy
from backend.common.schemas import ResourcePermissions
from fastapi import HTTPException, status as http_status

from backend.routes.sgotinish.messages import schemas


class MessagePolicy(BasePolicy):
    """Permissions for Message resources."""

    def check_read_list(self, conversation: Conversation, access: TicketAccess | None = None):
        """Check if user can list messages in a conversation."""
        if self.is_admin:
            return

        # Check if user is the ticket author
        if (
            conversation.ticket
            and self._is_owner(conversation.ticket.author_sub)
        ):
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

    def check_read_one(self, message: Message, access: TicketAccess | None = None):
        """Check if user can read a specific message."""
        if self.is_admin:
            return

        # Check if user is the ticket author
        if (
            message.conversation
            and message.conversation.ticket
            and self._is_owner(message.conversation.ticket.author_sub)
        ):
            return

        # Check if user has at least VIEW permission on the ticket
        if access and access.permission in [
            PermissionType.VIEW,
            PermissionType.ASSIGN,
            PermissionType.DELEGATE,
        ]:
            return

        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND, detail="Message not found"
        )

    def check_create(self, message_data: schemas.MessageCreateDTO, conversation: Conversation, access: TicketAccess | None = None):
        """Check if user can create a message in a conversation."""
        if self.is_admin:
            return

        # Check if user is the ticket author
        is_ticket_author = (
            conversation.ticket and self._is_owner(conversation.ticket.author_sub)
        )
        
        # Check if user is the conversation creator (assigned SG member)
        is_conversation_creator = self._is_owner(conversation.sg_member_sub)
        
        # Check if user has ASSIGN or DELEGATE permission on the ticket
        has_write_permission = access and access.permission in [
            PermissionType.ASSIGN,
            PermissionType.DELEGATE,
        ]

        if not (is_ticket_author or is_conversation_creator or has_write_permission):
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to send messages in this conversation.",
            )

        if message_data.sender_sub not in ("me", self.user_sub):
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="You can only send messages as yourself.",
            )

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
