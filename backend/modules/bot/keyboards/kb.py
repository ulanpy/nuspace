"""Inline and reply keyboards for Telegram handlers."""

from random import shuffle

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from backend.modules.bot.keyboards.callback_factory import ConfirmTelegramUser


def kb_url(url: str) -> InlineKeyboardMarkup:
    """Single button linking to the public nuspace site."""
    return InlineKeyboardMarkup(
        row_width=1, inline_keyboard=[[InlineKeyboardButton(text="nuspace", url=url)]]
    )


def kb_confirmation(token: str) -> InlineKeyboardMarkup:
    """Emoji grid for Telegram account linking confirmation."""
    emojis = ["🐬", "🦄", "🐖", "🐉", "🐁", "🐈", "🦍", "🐝", "🐺", "🐥"]
    buttons = [
        InlineKeyboardButton(
            text=emoji,
            callback_data=ConfirmTelegramUser(token=token, number=idx + 1).pack(),
        )
        for idx, emoji in enumerate(emojis)
    ]

    shuffle(buttons)
    keyboard = [buttons[i : i + 5] for i in range(0, len(buttons), 5)]

    return InlineKeyboardMarkup(inline_keyboard=keyboard)
