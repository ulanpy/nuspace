from aiogram import Router, F

from .language import router as command_language
from .start import router as start
from .start_deeplink import router as start_deeplink


def setup_private_message_router() -> Router:
    # ORDER MATTERS
    router: Router = Router(name="Private message router")
    router.include_router(command_language)
    router.include_router(start_deeplink)
    router.include_router(start)
    return router
