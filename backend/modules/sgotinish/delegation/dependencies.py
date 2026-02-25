from backend.common.dependencies import get_db_session, get_infra
from backend.common.schemas import Infra
from backend.modules.notification.service import NotificationService
from backend.modules.notion.service import NotionService
from backend.modules.sgotinish.delegation.service import DelegationService
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession


def get_delegation_service(
    db_session: AsyncSession = Depends(get_db_session), infra: Infra = Depends(get_infra)
) -> DelegationService:
    notification_service = NotificationService(db_session, infra)
    notion_service = NotionService(db_session, infra)
    return DelegationService(
        db_session=db_session,
        notification_service=notification_service,
        notion_service=notion_service,
    )
