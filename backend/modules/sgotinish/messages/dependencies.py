from backend.common.dependencies import get_db_session, get_infra
from backend.common.schemas import Infra
from backend.modules.notification.service import NotificationService
from backend.modules.sgotinish.messages.service import MessageService
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession


def get_message_service(
    db_session: AsyncSession = Depends(get_db_session),
    infra: Infra = Depends(get_infra),
) -> MessageService:
    notification_service = NotificationService(db_session, infra)
    return MessageService(db_session, notification_service)
