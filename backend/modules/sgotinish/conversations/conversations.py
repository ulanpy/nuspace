from typing import Annotated

from backend.common.dependencies import (
    get_creds_or_401,
)
from backend.core.database.models.sgotinish import (
    Conversation,
    Ticket,
)
from backend.modules.sgotinish.conversations import dependencies as deps
from backend.modules.sgotinish.conversations import schemas
from backend.modules.sgotinish.conversations.policy import ConversationPolicy
from backend.modules.sgotinish.conversations.service import ConversationService
from backend.modules.sgotinish.tickets.dependencies import get_ticket_service
from backend.modules.sgotinish.tickets.service import TicketService
from fastapi import APIRouter, Depends

router = APIRouter(tags=["SGotinish Conversations Routes"])


# ============================================================================
# CONVERSATION ENDPOINTS
# ============================================================================


@router.post("/conversations", response_model=schemas.ConversationResponseDTO)
async def create_conversation(
    conversation_data: schemas.ConversationCreateDTO,
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    service: ConversationService = Depends(deps.get_conversation_service),
    ticket: Ticket = Depends(deps.validate_ticket_exists_or_404),
    ticket_service: TicketService = Depends(get_ticket_service),
) -> schemas.ConversationResponseDTO:
    """
    Creates a new conversation for a ticket.

    **Access Policy:**
    - An SG member with at least ASSIGN access can create a conversation.
    - Each SG member can create only one conversation per ticket.
    - Admins can always create conversations.

    **Parameters:**
    - `conversation_data`: Conversation data including ticket_id, sg_member_sub

    **Returns:**
    - Created conversation with all its details
    """
    access = await ticket_service.get_user_ticket_access(ticket, user_tuple)

    ConversationPolicy(user_tuple).check_create(ticket, access)

    return await service.create_conversation(conversation_data=conversation_data, user=user_tuple)


@router.patch("/conversations/{conversation_id}", response_model=schemas.ConversationResponseDTO)
async def update_conversation(
    conversation_data: schemas.ConversationUpdateDTO,
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    service: ConversationService = Depends(deps.get_conversation_service),
    conversation: Conversation = Depends(deps.conversation_exists_or_404),
    ticket_service: TicketService = Depends(get_ticket_service),
) -> schemas.ConversationResponseDTO:
    """
    Updates fields of an existing conversation.

    **Access Policy:**
    - Admin can update any conversation
    - SG members can update conversations they are part of

    **Parameters:**
    - `conversation_id`: ID of the conversation to update
    - `conversation_data`: Updated conversation data

    **Returns:**
    - Updated conversation with all its details
    """
    access = await ticket_service.get_user_ticket_access(conversation.ticket, user_tuple)

    ConversationPolicy(user_tuple).check_update(access)
    return await service.update_conversation(
        conversation=conversation, conversation_data=conversation_data, user=user_tuple
    )
