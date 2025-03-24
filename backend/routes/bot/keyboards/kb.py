from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from random import shuffle

from backend.routes.bot.keyboards.callback_factory import ConfirmTelegramUser


def kb_webapp() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(row_width=1,
                                inline_keyboard=[
                                    [
                                        InlineKeyboardButton(text='NUspace', web_app=WebAppInfo(url="https://docs.aiogram.dev/en/dev-3.x/dispatcher/dispatcher.html"))
                                    ]
                                ])


def kb_register_groups() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text='NUspace', url="https://docs.aiogram.dev/en/dev-3.x/dispatcher/dispatcher.html")
        ]
    ])


def kb_confirmation(sub: str, confirmation_number: int) -> InlineKeyboardMarkup:
    buttons = [
        InlineKeyboardButton(text='🐬', callback_data=ConfirmTelegramUser(sub=sub, number=1,
                                                                         confirmation_number=confirmation_number).pack()),
        InlineKeyboardButton(text='🦄', callback_data=ConfirmTelegramUser(sub=sub, number=2,
                                                                         confirmation_number=confirmation_number).pack()),
        InlineKeyboardButton(text='🐖', callback_data=ConfirmTelegramUser(sub=sub, number=3,
                                                                         confirmation_number=confirmation_number).pack()),
        InlineKeyboardButton(text='🐉', callback_data=ConfirmTelegramUser(sub=sub, number=4,
                                                                         confirmation_number=confirmation_number).pack()),
        InlineKeyboardButton(text='🐁', callback_data=ConfirmTelegramUser(sub=sub, number=5,
                                                                         confirmation_number=confirmation_number).pack()),
        InlineKeyboardButton(text='🐈', callback_data=ConfirmTelegramUser(sub=sub, number=6,
                                                                         confirmation_number=confirmation_number).pack()),
        InlineKeyboardButton(text='🦍', callback_data=ConfirmTelegramUser(sub=sub, number=7,
                                                                         confirmation_number=confirmation_number).pack()),
        InlineKeyboardButton(text='🐝', callback_data=ConfirmTelegramUser(sub=sub, number=8,
                                                                         confirmation_number=confirmation_number).pack()),
        InlineKeyboardButton(text='🐺', callback_data=ConfirmTelegramUser(sub=sub, number=9,
                                                                         confirmation_number=confirmation_number).pack()),
        InlineKeyboardButton(text='🐥', callback_data=ConfirmTelegramUser(sub=sub, number=10,
                                                                         confirmation_number=confirmation_number).pack()),
    ]

    shuffle(buttons)
    keyboard = [buttons[i:i + 5] for i in range(0, len(buttons), 5)]

    return InlineKeyboardMarkup(inline_keyboard=keyboard)

