from backend.core.database.models.sgotinish import Ticket, Conversation
from backend.common.dependencies import get_db_session
from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.modules.sgotinish.messages.schemas import MessageCreateDTO


from backend.modules.sgotinish.conversations import schemas
from backend.modules.sgotinish.conversations.service import ConversationService

def get_conversation_service(
    db_session: AsyncSession = Depends(get_db_session),
) -> ConversationService:
    return ConversationService(db_session)



async def validate_ticket_exists_or_404(
    conversation_data: schemas.ConversationCreateDTO,
    db_session: AsyncSession = Depends(get_db_session),
) -> Ticket:
    """
    Dependency to validate that a ticket exists for conversation creation.
    
    Args:
        conversation_data: Conversation creation data
        db_session: Database session
        
    Returns:
        Ticket: The ticket if found
        
    Raises:
        HTTPException: 404 if ticket not found
    """
    stmt = (
        select(Ticket)
        .where(Ticket.id == conversation_data.ticket_id)
        .options(selectinload(Ticket.conversations))
    )
    result = await db_session.execute(stmt)
    ticket = result.scalars().first()
    
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


async def conversation_exists_or_404(
    conversation_id: int,
    db_session: AsyncSession = Depends(get_db_session),
) -> Conversation:
    """
    Dependency to validate that a conversation exists and return it.
    
    Args:
        conversation_id: ID of the conversation to validate
        db_session: Database session
        
    Returns:
        Conversation: The conversation if found
        
    Raises:
        HTTPException: 404 if conversation not found
    """
    stmt = (
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(
            selectinload(Conversation.ticket),
            selectinload(Conversation.sg_member),
        )
    )
    result = await db_session.execute(stmt)
    conversation = result.scalars().first()
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )
    return conversation



async def get_conversation_from_body_or_404(
    message_data: MessageCreateDTO,
    db_session: AsyncSession = Depends(get_db_session),
) -> Conversation:
    """
    Dependency to validate that a conversation from a request body exists and return it.
    """
    return await conversation_exists_or_404(message_data.conversation_id, db_session)
