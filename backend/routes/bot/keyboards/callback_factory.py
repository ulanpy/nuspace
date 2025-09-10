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


# Piano Room Booking Callback Data
class PianoScheduleDay(CallbackData, prefix="piano_day"):
    date: str  # YYYY-MM-DD format


class PianoTimeSlot(CallbackData, prefix="piano_time"):
    date: str  # YYYY-MM-DD format
    hour: int  # 0-23


class PianoBookingConfirm(CallbackData, prefix="piano_confirm"):
    date: str  # YYYY-MM-DD format
    hour: int  # 0-23


class PianoBookingCancel(CallbackData, prefix="piano_cancel"):
    booking_id: int


class PianoDropConfirm(CallbackData, prefix="piano_drop"):
    booking_id: int
