from backend.modules.sgotinish.conversations.service import ConversationService
from backend.modules.sgotinish.tickets.dependencies import get_ticket_service
from backend.modules.sgotinish.tickets.service import TicketService
from fastapi import Depends


def get_conversation_service(
    ticket_service: TicketService = Depends(get_ticket_service),
) -> ConversationService:
    return ticket_service.conversation_service
