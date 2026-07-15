from backend.common.dependencies import get_db_session
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.sgotinish.conversations.service import ConversationService


def get_conversation_service(
    db_session: AsyncSession = Depends(get_db_session),
) -> ConversationService:
    return ConversationService(db_session)
