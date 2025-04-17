from aiogram import F, Router
from aiogram.enums.chat_type import ChatType

from .callback import setup_private_callback_router
from .messages import setup_private_message_router


def setup_private_routers():
    router: Router = Router(name="Private router")
    router.message.filter(F.chat.type == ChatType.PRIVATE)
    # router.callback_query.filter(F.chat.type == ChatType.PRIVATE)

    callback_router: Router = setup_private_callback_router()
    message_router: Router = setup_private_message_router()
    router.include_router(callback_router)
    router.include_router(message_router)
    return router
