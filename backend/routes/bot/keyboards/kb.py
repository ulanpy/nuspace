import time
from random import shuffle
from typing import Callable

from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    KeyboardButtonRequestUsers,
    ReplyKeyboardMarkup,
)

from backend.routes.bot.keyboards.callback_factory import (
    ConfirmTelegramUser,
    Languages,
    NotificationAction,
)
from backend.routes.bot.utils.enums import NotificationEnum


def notifications_keyboard(
    action: NotificationEnum, _: Callable[[str], str]
) -> InlineKeyboardMarkup:
    text = (
        _("✅Включить уведомления")
        if action == NotificationEnum.ENABLE
        else _("⛔️Выключить уведомления")
    )
    button = InlineKeyboardButton(text=text, callback_data=NotificationAction(action=action).pack())

    keyboard = InlineKeyboardMarkup(inline_keyboard=[[button]])
    return keyboard


def kb_url(url: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        row_width=1, inline_keyboard=[[InlineKeyboardButton(text="NUspace", url=url)]]
    )


def kb_confirmation(sub: str, confirmation_number: int) -> InlineKeyboardMarkup:
    emojis = ["🐬", "🦄", "🐖", "🐉", "🐁", "🐈", "🦍", "🐝", "🐺", "🐥"]
    buttons = [
        InlineKeyboardButton(
            text=emoji,
            callback_data=ConfirmTelegramUser(
                sub=sub, number=idx + 1, confirmation_number=confirmation_number
            ).pack(),
        )
        for idx, emoji in enumerate(emojis)
    ]

    shuffle(buttons)
    keyboard = [buttons[i : i + 5] for i in range(0, len(buttons), 5)]

    return InlineKeyboardMarkup(inline_keyboard=keyboard)


def kb_languages() -> InlineKeyboardMarkup:
    emojis = ["🇰🇿", "🇷🇺", "🇺🇸"]
    callback_data = ["kz", "ru", "en"]
    buttons = [
        [
            InlineKeyboardButton(text=emoji, callback_data=Languages(language=cb_data).pack())
            for emoji, cb_data in zip(emojis, callback_data)
        ]
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_user_selector_kb(_: Callable[[str], str]) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [
                KeyboardButton(
                    text=_("Выберите пользователя"),
                    request_users=KeyboardButtonRequestUsers(
                        request_id=int(time.time() * 1000) % (2**31 - 1),
                        user_is_bot=False,
                        max_quantity=1,
                    ),
                )
            ]
        ],
        resize_keyboard=True,
    )


def user_profile_button(user_id: int, _: Callable[[str], str]) -> InlineKeyboardMarkup:
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=_("Профиль пользователя"), url=f"tg://user?id={user_id}")]
        ]
    )
    return keyboard
