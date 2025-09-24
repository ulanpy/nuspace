from typing import Annotated

from backend.common.dependencies import (
    get_creds_or_401,
    get_creds_or_guest,
    get_db_session,
)
from backend.core.database.models.sgotinish import (
    Conversation,
    Message,
)
from backend.routes.sgotinish.conversations.dependencies import (
    conversation_exists_or_404,
    get_conversation_from_body_or_404,
)
from backend.routes.sgotinish.messages import dependencies as deps
from backend.routes.sgotinish.messages import schemas
from backend.routes.sgotinish.messages.policy import MessagePolicy
from backend.routes.sgotinish.messages.service import MessageService
from backend.routes.sgotinish.tickets.dependencies import get_ticket_service
from backend.routes.sgotinish.tickets.service import TicketService
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["SGotinish Messages Routes"])


def get_message_service(
    db_session: AsyncSession = Depends(get_db_session),
) -> MessageService:
    return MessageService(db_session)


# ============================================================================
# MESSAGE ENDPOINTS
# ============================================================================


@router.post("/messages", response_model=schemas.MessageResponseDTO)
async def create_message(
    message_data: schemas.MessageCreateDTO,
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    service: MessageService = Depends(get_message_service),
    ticket_service: TicketService = Depends(get_ticket_service),
    conversation: Conversation = Depends(get_conversation_from_body_or_404),
) -> schemas.MessageResponseDTO:
    """
    Creates a new message in a conversation.

    **Access Policy:**
    - Users can send messages in conversations for their tickets
    - SG members can send messages in any conversation

    **Parameters:**
    - `message_data`: Message data including conversation_id, sender_sub, body

    **Returns:**
    - Created message with all its details
    """
    # Get ticket access for permission checking
    access = await ticket_service.get_user_ticket_access(conversation.ticket, user_tuple)

    MessagePolicy(user_tuple).check_create(message_data, conversation, access)
    return await service.create_message(message_data=message_data, user=user_tuple)


@router.get("/messages", response_model=schemas.ListMessageDTO)
async def get_messages(
    conversation_id: int,
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    service: MessageService = Depends(get_message_service),
    ticket_service: TicketService = Depends(get_ticket_service),
    conversation: Conversation = Depends(conversation_exists_or_404),
    size: int = Query(20, ge=1, le=100),
    page: int = 1,
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
    access = await ticket_service.get_user_ticket_access(conversation.ticket, user_tuple)

    MessagePolicy(user_tuple).check_read_list(conversation, access)

    return await service.get_messages(
        conversation_id=conversation_id, size=size, page=page, user=user_tuple
    )


@router.get("/messages/{message_id}", response_model=schemas.MessageResponseDTO)
async def get_message(
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    message: Message = Depends(deps.message_exists_or_404),
    service: MessageService = Depends(get_message_service),
    ticket_service: TicketService = Depends(get_ticket_service),
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

    MessagePolicy(user_tuple).check_read_one(message, access)
    return await service.get_message_by_id(message_id=message.id, user=user_tuple)


# ============================================================================
# MESSAGE READ STATUS ENDPOINTS
# ============================================================================


@router.post("/messages/{message_id}/read", response_model=schemas.MessageResponseDTO)
async def mark_message_as_read(
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    message: Message = Depends(deps.message_exists_or_404),
    service: MessageService = Depends(get_message_service),
    ticket_service: TicketService = Depends(get_ticket_service),
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

    MessagePolicy(user_tuple).check_read_one(message, access)
    return await service.mark_message_as_read(message=message, user=user_tuple)
