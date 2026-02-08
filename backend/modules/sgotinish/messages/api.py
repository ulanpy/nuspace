from typing import Annotated

from backend.common.dependencies import (
    get_creds_or_401,
    get_creds_or_guest,
    get_db_session,
    get_infra,
)
from backend.common.schemas import Infra
from backend.core.database.models.sgotinish import (
    Conversation,
    Message,
    TicketAccess,
)
from backend.modules.notification.service import NotificationService
from backend.modules.sgotinish.conversations.dependencies import (
    conversation_exists_or_404,
    get_conversation_from_body_or_404,
)
from backend.modules.sgotinish.messages import dependencies as deps
from backend.modules.sgotinish.messages import schemas
from backend.modules.sgotinish.messages.policy import MessagePolicy
from backend.modules.sgotinish.messages.service import MessageService
from backend.modules.sgotinish.tickets.dependencies import get_ticket_service
from backend.modules.sgotinish.tickets.service import TicketService
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["SGotinish Messages Routes"])


def get_message_service(
    db_session: AsyncSession = Depends(get_db_session),
    infra: Infra = Depends(get_infra),
) -> MessageService:
    notification_service = NotificationService(db_session, infra)
    return MessageService(db_session, notification_service)


# ============================================================================
# MESSAGE ENDPOINTS
# ============================================================================


@router.post("/messages", response_model=schemas.MessageResponseDTO)
async def create_message(
    message_data: schemas.MessageCreateDTO,
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    service: MessageService = Depends(get_message_service),
    ticket_service: TicketService = Depends(get_ticket_service),
    conversation: Conversation = Depends(get_conversation_from_body_or_404),
    owner_hash: str | None = Query(default=None),
) -> schemas.MessageResponseDTO:
    """
    Creates a new message in a conversation.

    **Access Policy:**
    - The author of the ticket can send messages.
    - SG member with Assign or Delegate permission can send messages.
    - Admins can always send messages.

    **Parameters:**
    - `message_data`: Message data including conversation_id, sender_sub, body

    **Returns:**
    - Created message with all its details
    """
    # Get ticket access for permission checking
    access: TicketAccess | None = await ticket_service.get_user_ticket_access(conversation.ticket, user_tuple)
    
    # если owner_hash передан, то проверяем совпадение с owner_hash тикета
    owner_hash_match = False
    if owner_hash:
        owner_hash_match = conversation.ticket.owner_hash == owner_hash    
        
    # Написать сообщение может только автор тикета или SG член с Assign или Delegate permission
    MessagePolicy(user_tuple).check_create(
        conversation, access, owner_hash_match=owner_hash_match
    )
    return await service.create_message(
        message_data=message_data,
        user=user_tuple,
        conversation=conversation,
        owner_hash=owner_hash if owner_hash_match else None,
    )


@router.get("/messages", response_model=schemas.ListMessageDTO)
async def get_messages(
    conversation_id: int,
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    service: MessageService = Depends(get_message_service),
    ticket_service: TicketService = Depends(get_ticket_service),
    conversation: Conversation = Depends(conversation_exists_or_404),
    size: int = Query(20, ge=1, le=100),
    page: int = 1,
    owner_hash: str | None = Query(default=None),
) -> schemas.ListMessageDTO:
    """
    Retrieves a paginated list of messages with flexible filtering.

    **Access Policy:**
    - SG members and admins can view all messages
    - Regular users can only view messages in conversations for their tickets

    **Parameters:**
    - `size`: Number of messages per page (default: 20, max: 100)
    - `page`: Page number (default: 1)
    - `conversation_id`: Filter by specific conversation (required)

    **Returns:**
    - List of messages matching the criteria with pagination info
    """
    # Get ticket access for permission checking
    access: TicketAccess | None = await ticket_service.get_user_ticket_access(conversation.ticket, user_tuple)

    # если owner_hash передан, то проверяем совпадение с owner_hash тикета
    owner_hash_match = False
    if owner_hash:
        owner_hash_match = conversation.ticket.owner_hash == owner_hash

    # Смотреть список сообщений может только автор тикета или SG член с VIEW, ASSIGN или DELEGATE permission    
    MessagePolicy(user_tuple).check_read_list(conversation, access, owner_hash_match=owner_hash_match)

    return await service.get_messages(
        conversation_id=conversation_id, size=size, page=page, user=user_tuple
    )


@router.get("/messages/{message_id}", response_model=schemas.MessageResponseDTO)
async def get_message(
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    message: Message = Depends(deps.message_exists_or_404),
    service: MessageService = Depends(get_message_service),
    ticket_service: TicketService = Depends(get_ticket_service),
    owner_hash: str | None = Query(default=None),
) -> schemas.MessageResponseDTO:
    """
    Retrieves a single message by its unique ID.

    **Access Policy:**
    - SG members and admins can view all messages
    - Regular users can only view messages in conversations for their tickets

    **Parameters:**
    - `message_id`: The unique identifier of the message to retrieve

    **Returns:**
    - A detailed message object with all its information
    """
    # Get ticket access for permission checking
    access = await ticket_service.get_user_ticket_access(message.conversation.ticket, user_tuple)

    owner_hash_match = bool(
        owner_hash
        and message.conversation
        and message.conversation.ticket
        and message.conversation.ticket.owner_hash == owner_hash
    )
    MessagePolicy(user_tuple).check_read_one(message, access, owner_hash_match=owner_hash_match)
    return await service.get_message_by_id(message_id=message.id, user=user_tuple)


# ============================================================================
# MESSAGE READ STATUS ENDPOINTS
# ============================================================================


@router.post("/messages/{message_id}/read", response_model=schemas.MessageResponseDTO)
async def mark_message_as_read(
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    message: Message = Depends(deps.message_exists_or_404),
    service: MessageService = Depends(get_message_service),
    ticket_service: TicketService = Depends(get_ticket_service),
    owner_hash: str | None = Query(default=None),
) -> schemas.MessageResponseDTO:
    """
    Marks a message as read by the current user.

    **Access Policy:**
    - Users can mark messages as read if they have access to the conversation

    **Parameters:**
    - `message_id`: The ID of the message to mark as read

    **Returns:**
    - The updated message with its read status information
    """
    # Get ticket access for permission checking
    access = await ticket_service.get_user_ticket_access(message.conversation.ticket, user_tuple)

    # если owner_hash передан, то проверяем совпадение с owner_hash тикета
    owner_hash_match = False
    if owner_hash:
        owner_hash_match = message.conversation.ticket.owner_hash == owner_hash
        
    # Пометить сообщение как прочитанное может только автор тикета или SG член с VIEW, ASSIGN или DELEGATE permission
    MessagePolicy(user_tuple).check_read_one(
        message, access, owner_hash_match=owner_hash_match
    )
    return await service.mark_message_as_read(
        message=message,
        user=user_tuple,
        owner_hash=owner_hash if owner_hash_match else None,
    )
