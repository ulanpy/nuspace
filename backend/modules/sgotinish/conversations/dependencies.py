from backend.common.dependencies import get_db_session
from backend.modules.sgotinish.conversations.service import ConversationService
from backend.modules.sgotinish.tickets.dependencies import get_ticket_service
from backend.modules.sgotinish.tickets.service import TicketService
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession


def get_conversation_service(
    db_session: AsyncSession = Depends(get_db_session),
    ticket_service: TicketService = Depends(get_ticket_service),
) -> ConversationService:
    # Built the same way the message service is: TicketService satisfies the
    # TicketAccessChecker protocol the conversation service needs.
    #
    # This previously returned `ticket_service.conversation_service`, an
    # attribute TicketService does not define, so every conversation endpoint
    # raised AttributeError and answered 500.
    return ConversationService(db_session, ticket_service)
