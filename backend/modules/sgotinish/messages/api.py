from typing import Annotated

from backend.modules.auth.dependencies import (
    get_creds_or_401,
    get_creds_or_guest,
)
from backend.modules.sgotinish.messages import dependencies as deps
from backend.modules.sgotinish.messages import schemas
from backend.modules.sgotinish.messages.service import MessageService
from fastapi import APIRouter, Depends, Query

router = APIRouter(tags=["SGotinish Messages Routes"])


# ============================================================================
# MESSAGE ENDPOINTS
# ============================================================================


@router.post("/messages", response_model=schemas.MessageResponseDTO)
async def create_message(
    message_data: schemas.MessageCreateDTO,
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    service: MessageService = Depends(deps.get_message_service),
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
    return await service.create_message(
        message_data=message_data,
        user=user_tuple,
        owner_hash=owner_hash,
    )


@router.get("/messages", response_model=schemas.ListMessageDTO)
async def get_messages(
    conversation_id: int,
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    service: MessageService = Depends(deps.get_message_service),
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
    return await service.get_messages(
        conversation_id=conversation_id,
        size=size,
        page=page,
        user=user_tuple,
        owner_hash=owner_hash,
    )


@router.get("/messages/{message_id}", response_model=schemas.MessageResponseDTO)
async def get_message(
    message_id: int,
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    service: MessageService = Depends(deps.get_message_service),
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
    return await service.get_message_by_id(
        message_id=message_id,
        user=user_tuple,
        owner_hash=owner_hash,
    )


# ============================================================================
# MESSAGE READ STATUS ENDPOINTS
# ============================================================================


@router.post("/messages/{message_id}/read", response_model=schemas.MessageResponseDTO)
async def mark_message_as_read(
    message_id: int,
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    service: MessageService = Depends(deps.get_message_service),
    owner_hash: str | None = Query(default=None),
) -> schemas.MessageResponseDTO:
    """
    Marks a message as read by the current user.

    **Access Policy:**
    - SG members and admins can mark any message as read
    - Regular users can only mark messages in conversations for their tickets

    **Parameters:**
    - `message_id`: The unique identifier of the message to mark as read

    **Returns:**
    - Updated message with read status
    """
    return await service.mark_message_as_read(
        message_id=message_id,
        user=user_tuple,
        owner_hash=owner_hash,
    )
