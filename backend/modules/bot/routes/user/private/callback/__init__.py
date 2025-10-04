from aiogram import Router

from .confirmation import router as confirmation
from .language import router as language
from .notification import router as notification


def setup_private_callback_router() -> Router:
    router: Router = Router(name="Private callback router")
    router.include_router(language)
    router.include_router(confirmation)
    router.include_router(notification)
    return router
