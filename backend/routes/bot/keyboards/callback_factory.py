from aiogram.filters.callback_data import CallbackData


class ConfirmTelegramUser(CallbackData, prefix="confirm"):
    sub: str
    number: int
    confirmation_number: int

class Languages(CallbackData, prefix="language"):
    language: str