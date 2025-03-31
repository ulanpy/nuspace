from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from random import shuffle

from backend.routes.bot.keyboards.callback_factory import ConfirmTelegramUser, Languages


def kb_webapp(url: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(row_width=1,
                                inline_keyboard=[
                                    [
                                        InlineKeyboardButton(text='NUspace', web_app=WebAppInfo(url=url))
                                    ]
                                ])


def kb_register_groups(url: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text='NUspace', url=url)
        ]
    ])


def kb_confirmation(sub: str, confirmation_number: int) -> InlineKeyboardMarkup:
    emojis = ['🐬', '🦄', '🐖', '🐉', '🐁', '🐈', '🦍', '🐝', '🐺', '🐥']
    buttons = [
        InlineKeyboardButton(
            text=emoji,
            callback_data=ConfirmTelegramUser(
                sub=sub,
                number=idx + 1,
                confirmation_number=confirmation_number
            ).pack()
        )
        for idx, emoji in enumerate(emojis)
    ]

    shuffle(buttons)
    keyboard = [buttons[i:i + 5] for i in range(0, len(buttons), 5)]

    return InlineKeyboardMarkup(inline_keyboard=keyboard)

@router.post("/linkedtg")
async def get_telegram_id(request: Request,
                          sub: str,
                          db_session: AsyncSession = Depends(get_db_session)) -> bool:
    result = await db_session.execute(select(User.telegram_id).filter_by(sub=sub))
    user_exist: bool = bool(result.scalars().first())
    return user_exist


def kb_languages():
    emojis = ['🇰🇿', '🇷🇺', '🇺🇸']
    callback_data = ['kz', 'ru', 'en']
    buttons = [
        [
            InlineKeyboardButton(
                text=emoji,
                callback_data=Languages(language=cb_data).pack()
            )
            for emoji, cb_data in zip(emojis, callback_data)
        ]
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)

