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
    PianoScheduleDay,
    PianoTimeSlot,
    PianoBookingConfirm,
    PianoBookingCancel,
    PianoDropConfirm,
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


# Piano Room Booking Keyboards

def piano_weekly_schedule_keyboard(week_days: list[tuple[str, str]], _: Callable[[str], str]) -> InlineKeyboardMarkup:
    """Create keyboard for selecting days of the week
    
    Args:
        week_days: List of tuples (date_str, day_name) where date_str is YYYY-MM-DD format
    """
    buttons = []
    for date_str, day_name in week_days:
        button = InlineKeyboardButton(
            text=f"{day_name}",
            callback_data=PianoScheduleDay(date=date_str).pack()
        )
        buttons.append([button])
    
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def piano_time_slots_keyboard(
    date_str: str, 
    available_hours: list[int], 
    _: Callable[[str], str]
) -> InlineKeyboardMarkup:
    """Create keyboard for selecting time slots for a specific day"""
    buttons = []
    
    # Group hours in rows of 3
    for i in range(0, len(available_hours), 3):
        row = []
        for hour in available_hours[i:i+3]:
            button = InlineKeyboardButton(
                text=f"{hour:02d}:00-{hour+1:02d}:00",
                callback_data=PianoTimeSlot(date=date_str, hour=hour).pack()
            )
            row.append(button)
        buttons.append(row)
    
    # Back button
    back_button = InlineKeyboardButton(
        text=_("⬅️ Назад"),
        callback_data="piano_back_to_schedule"
    )
    buttons.append([back_button])
    
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def piano_booking_confirmation_keyboard(
    date_str: str, 
    hour: int, 
    _: Callable[[str], str]
) -> InlineKeyboardMarkup:
    """Create confirmation keyboard for booking"""
    confirm_button = InlineKeyboardButton(
        text=_("✅ Подтвердить"),
        callback_data=PianoBookingConfirm(date=date_str, hour=hour).pack()
    )
    cancel_button = InlineKeyboardButton(
        text=_("❌ Отменить"),
        callback_data=PianoBookingCancel(booking_id=0).pack()  # booking_id=0 means cancel before creation
    )
    
    return InlineKeyboardMarkup(inline_keyboard=[[confirm_button], [cancel_button]])


def piano_user_bookings_keyboard(bookings: list[tuple[int, str]], _: Callable[[str], str]) -> InlineKeyboardMarkup:
    """Create keyboard showing user's bookings with drop options
    
    Args:
        bookings: List of tuples (booking_id, booking_description)
    """
    buttons = []
    
    for booking_id, description in bookings:
        button = InlineKeyboardButton(
            text=f"❌ {description}",
            callback_data=PianoDropConfirm(booking_id=booking_id).pack()
        )
        buttons.append([button])
    
    return InlineKeyboardMarkup(inline_keyboard=buttons)


