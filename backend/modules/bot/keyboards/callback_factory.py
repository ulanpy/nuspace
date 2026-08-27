"""CallbackData factories for inline keyboard payloads."""

from aiogram.filters.callback_data import CallbackData


class ConfirmTelegramUser(CallbackData, prefix="confirm"):
    """Telegram linking: user picks the emoji shown on the website."""

    token: str
    number: int


class CourseGradesPage(CallbackData, prefix="cgr"):
    """Pagination for /course grade report results."""

    page: int


class OtinishCategoryCallback(CallbackData, prefix="otinish_cat"):
    category: str


class OtinishCheckLinkCallback(CallbackData, prefix="otinish_check"):
    noop: int = 1


class OtinishCloseConfirmCallback(CallbackData, prefix="otinish_close"):
    """Confirm closing an open otinish channel."""

    ticket_id: int
    confirm: int  # 1 = yes, 0 = cancel
