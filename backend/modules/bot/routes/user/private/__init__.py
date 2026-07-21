"""Private-chat handlers: account linking and event posting."""

from aiogram import F, Router
from aiogram.enums.chat_type import ChatType

from backend.modules.bot.routes.user.private.messages.start import router as start
from backend.modules.bot.routes.user.private.messages.start_deeplink import router as start_deeplink
from backend.modules.bot.routes.user.private.messages.post_event import router as post_event
from backend.modules.bot.routes.user.private.callback.confirmation import router as confirmation


def setup_private_callback_router() -> Router:
    router: Router = Router(name="Private callback router")
    router.include_router(confirmation)
    return router


def setup_private_message_router() -> Router:
    # Order matters: deep-link /start before plain /start.
    router: Router = Router(name="Private message router")
    router.include_router(start_deeplink)
    router.include_router(start)
    router.include_router(post_event)
    return router


def setup_private_routers() -> Router:
    router: Router = Router(name="Private router")
    router.message.filter(F.chat.type == ChatType.PRIVATE)

    router.include_router(setup_private_callback_router())
    router.include_router(setup_private_message_router())
    return router
