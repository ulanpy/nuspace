from fastapi import BackgroundTasks, Depends, Request

from backend.common.dependencies import get_uow
from backend.core.database.uow import UnitOfWork
from backend.modules.bot.dependencies import build_direct_messenger
from backend.modules.events.notices import EventNotifier
from backend.modules.events.service import EventService
from backend.modules.media.dependencies import build_media_service


def build_event_notifier(
    request: Request, background_tasks: BackgroundTasks
) -> EventNotifier | None:
    """The notifier over the app's bot; None when the bot is not running."""
    bot = getattr(request.app.state, "bot", None)
    if bot is None:
        return None
    return EventNotifier(
        messenger=build_direct_messenger(bot),
        events_origin=request.app.state.config.service_origin("events"),
        schedule=background_tasks.add_task,
    )


async def get_event_service(
    request: Request,
    background_tasks: BackgroundTasks,
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
        notifier=build_event_notifier(request, background_tasks),
    )
