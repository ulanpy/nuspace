from backend.common.dependencies import get_db_session, get_infra
from backend.common.schemas import Infra
from backend.modules.notification.service import NotificationService
from backend.modules.notion.service import NotionService
from backend.modules.sgotinish.conversations.service import ConversationService
from backend.modules.sgotinish.tickets.service import TicketService
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession


def get_ticket_service(
    db_session: AsyncSession = Depends(get_db_session), infra: Infra = Depends(get_infra)
) -> TicketService:
    ticket_notifier = NotificationService(db_session, infra)
    ticket_notion_sync = NotionService(db_session, infra)

    ticket_service = TicketService(
        db_session=db_session,
        ticket_notifier=ticket_notifier,
        ticket_notion_sync=ticket_notion_sync,
    )
    ticket_service.ticket_conversations = ConversationService(db_session, ticket_service)
    return ticket_service
