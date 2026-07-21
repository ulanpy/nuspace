"""CallbackData factories for inline keyboard payloads."""

from aiogram.filters.callback_data import CallbackData


class ConfirmTelegramUser(CallbackData, prefix="confirm"):
    """Telegram linking: user picks the emoji shown on the website."""

    sub: str
    number: int
    confirmation_number: int


class CourseGradesPage(CallbackData, prefix="cgr"):
    """Pagination for /course grade report results."""

    page: int
