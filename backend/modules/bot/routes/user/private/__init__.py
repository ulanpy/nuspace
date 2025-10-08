from aiogram import F, Router
from aiogram.enums.chat_type import ChatType


from backend.modules.bot.routes.user.private.messages.start import router as start
from backend.modules.bot.routes.user.private.messages.start_deeplink import router as start_deeplink
from backend.modules.bot.routes.user.private.messages.student_validator import router as student_validator
from backend.modules.bot.routes.user.private.callback.confirmation import router as confirmation


def setup_private_callback_router() -> Router:
    router: Router = Router(name="Private callback router")
    router.include_router(confirmation)
    return router

def setup_private_message_router() -> Router:
    # ORDER MATTERS
    router: Router = Router(name="Private message router")
    router.include_router(start_deeplink)
    router.include_router(start)
    router.include_router(student_validator)
    return router

def setup_private_routers():
    router: Router = Router(name="Private router")
    router.message.filter(F.chat.type == ChatType.PRIVATE)

    callback_router: Router = setup_private_callback_router()
    message_router: Router = setup_private_message_router()
    router.include_router(callback_router)
    router.include_router(message_router)
    return router
