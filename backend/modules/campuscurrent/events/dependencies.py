from fastapi import Depends, Request

from backend.common.dependencies import get_uow
from backend.core.database.uow import UnitOfWork
from backend.modules.campuscurrent.events.service import EventService
from backend.modules.media.dependencies import build_media_service


async def get_event_service(
    request: Request,
    uow: UnitOfWork = Depends(get_uow),
) -> EventService:
    return EventService(
        uow=uow,
        media_attachment_resolver=build_media_service(
            uow=uow,
            storage_client=request.app.state.storage_client,
            config=request.app.state.config,
            signing_credentials=request.app.state.signing_credentials,
        ),
        meilisearch_client=request.app.state.meilisearch_client,
    )
