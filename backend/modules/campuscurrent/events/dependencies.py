from fastapi import Depends

from backend.common.dependencies import get_infra, get_uow
from backend.common.schemas import Infra
from backend.core.database.uow import UnitOfWork
from backend.modules.campuscurrent.events.service import EventService
from backend.modules.media.dependencies import build_media_service


def get_event_service(
    infra: Infra = Depends(get_infra),
    uow: UnitOfWork = Depends(get_uow),
) -> EventService:
    return EventService(
        uow=uow,
        media_attachment_resolver=build_media_service(uow, infra),
    )
