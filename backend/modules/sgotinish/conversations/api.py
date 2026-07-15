from typing import Annotated

from backend.modules.auth.dependencies import get_creds_or_401
from backend.modules.sgotinish.conversations import dependencies as deps
from backend.modules.sgotinish.conversations import schemas
from backend.modules.sgotinish.conversations.service import ConversationService
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
) -> schemas.ConversationResponseDTO:
    """
    Creates a new conversation for a ticket.

    **Access Policy:**
    - An SG member with at least ASSIGN access can create a conversation.
    - For all SG members, only one conversation per ticket.
    - Admins can always create conversations.

    **Parameters:**
    - `conversation_data`: Conversation data including ticket_id, sg_member_sub

    **Returns:**
    - Created conversation with all its details
    """
    return await service.create_conversation(
        conversation_data=conversation_data,
        user=user_tuple,
    )


@router.patch("/conversations/{conversation_id}", response_model=schemas.ConversationResponseDTO)
async def update_conversation(
    conversation_id: int,
    conversation_data: schemas.ConversationUpdateDTO,
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    service: ConversationService = Depends(deps.get_conversation_service),
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
    return await service.update_conversation(
        conversation_id=conversation_id,
        conversation_data=conversation_data,
        user=user_tuple,
    )
