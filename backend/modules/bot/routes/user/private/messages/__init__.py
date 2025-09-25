from aiogram import Router

from .language import router as command_language
from .notification import router as notification
from .start import router as start
from .start_deeplink import router as start_deeplink
from .student_validator import router as student_validator


def setup_private_message_router() -> Router:
    # ORDER MATTERS
    router: Router = Router(name="Private message router")
    router.include_router(command_language)
    router.include_router(start_deeplink)
    router.include_router(start)
    router.include_router(student_validator)
    router.include_router(notification)
    return router
