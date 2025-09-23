from backend.core.database.models.sgotinish import Message
from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_db_session
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.core.database.models.sgotinish import Conversation



async def message_exists_or_404(
    message_id: int,
    db_session: AsyncSession = Depends(get_db_session),
) -> Message:
    """
    Dependency to validate that a message exists and return it.
    
    Args:
        message_id: ID of the message to validate
        db_session: Database session
        
    Returns:
        Message: The message if found
        
    Raises:
        HTTPException: 404 if message not found
    """
    qb = QueryBuilder(session=db_session, model=Message)
    message = (
        await qb.base()
        .eager(Message.conversation, Message.sender)
        .option(selectinload(Message.conversation).selectinload(Conversation.ticket))
        .filter(Message.id == message_id)
        .first()
    )
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    return message

