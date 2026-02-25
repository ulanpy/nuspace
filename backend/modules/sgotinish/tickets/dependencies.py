from backend.common.dependencies import get_db_session, get_infra
from backend.common.schemas import Infra
from backend.core.database.models.sgotinish import Ticket
from backend.modules.notification.service import NotificationService
from backend.modules.notion.service import NotionService
from backend.modules.sgotinish.conversations.service import ConversationService
from backend.modules.sgotinish.tickets.service import TicketService
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession


def get_ticket_service(
    db_session: AsyncSession = Depends(get_db_session), infra: Infra = Depends(get_infra)
) -> TicketService:
    """Constructs and returns a TicketService with its dependencies."""
    # This is the Composition Root. It knows about the concrete implementations.
    notification_service = NotificationService(db_session, infra)
    conversation_service = ConversationService(db_session)
    notion_service = NotionService(db_session, infra)

    return TicketService(
        db_session=db_session,
        conversation_service=conversation_service,
        notification_service=notification_service,
        notion_service=notion_service,
    )
async def get_ticket(
    ticket_id: int,
    ticket_service: TicketService = Depends(get_ticket_service),
) -> Ticket:
    """Dependency to validate that a ticket exists and return it."""
    return await ticket_service.get_ticket_entity_or_404(ticket_id)
