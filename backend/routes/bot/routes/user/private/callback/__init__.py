from aiogram import Router, F
from aiogram.enums.chat_type import ChatType

from .confirmation import router as confirmation
from .language import router as language


def setup_private_callback_router() -> Router:
    router: Router = Router(name="Private callback router")
    router.include_router(language)
    router.include_router(confirmation)
    return router
