from aiogram.filters.callback_data import CallbackData
from backend.routes.bot.utils.enums import NotificationEnum


class ConfirmTelegramUser(CallbackData, prefix="confirm"):
    sub: str
    number: int
    confirmation_number: int


class Languages(CallbackData, prefix="language"):
    language: str


class NotificationAction(CallbackData, prefix="notif"):
    action: NotificationEnum
