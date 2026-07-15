from backend.common.dependencies import get_db_session, get_infra
from backend.common.schemas import Infra
from backend.modules.notification.service import NotificationService
from backend.modules.sgotinish.messages.service import MessageService
from backend.modules.sgotinish.tickets.dependencies import get_ticket_service
from backend.modules.sgotinish.tickets.service import TicketService
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession


def get_message_service(
    db_session: AsyncSession = Depends(get_db_session),
    infra: Infra = Depends(get_infra),
    ticket_service: TicketService = Depends(get_ticket_service),
) -> MessageService:
    notification_service = NotificationService(db_session, infra)
    return MessageService(db_session, notification_service, ticket_service)
