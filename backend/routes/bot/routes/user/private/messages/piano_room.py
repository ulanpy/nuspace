from datetime import datetime, timedelta
from typing import Callable

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.routes.bot.cruds import (
    get_user_by_telegram_id,
    get_weekly_bookings,
    count_user_weekly_bookings,
)
from backend.routes.bot.keyboards.kb import piano_weekly_schedule_keyboard
from backend.routes.bot.utils.piano_utils import (
    get_current_week_start,
    get_week_days_list,
    format_weekly_schedule,
)

router = Router()


@router.message(Command("schedule"))
async def show_piano_schedule(
    message: Message,
    db_session: AsyncSession,
    _: Callable[[str], str],
):
    """Show weekly piano room schedule"""
    # Check if user is authenticated
    user = await get_user_by_telegram_id(db_session, message.from_user.id)
    if not user:
        await message.answer(_("❌ Вы не авторизованы. Пожалуйста, пройдите аутентификацию через NUspace."))
        return

    # Get current week
    week_start = get_current_week_start()
    week_days = get_week_days_list(week_start)
    
    # Get all bookings for the week
    weekly_bookings = await get_weekly_bookings(db_session, week_start)
    
    # Format schedule text
    schedule_text = format_weekly_schedule(weekly_bookings, week_days, _)
    
    # Create keyboard for day selection
    keyboard = piano_weekly_schedule_keyboard(week_days, _)
    
    await message.answer(
        f"🎹 **{_('Расписание Piano Room')}**\n\n{schedule_text}\n\n{_('Выберите день для бронирования:')}",
        reply_markup=keyboard,
        parse_mode="Markdown"
    )


@router.message(Command("mybookings"))
async def show_my_bookings(
    message: Message,
    db_session: AsyncSession,
    _: Callable[[str], str],
):
    """Show user's current bookings"""
    # Check if user is authenticated
    user = await get_user_by_telegram_id(db_session, message.from_user.id)
    if not user:
        await message.answer(_("❌ Вы не авторизованы. Пожалуйста, пройдите аутентификацию через NUspace."))
        return

    from backend.routes.bot.cruds import get_user_bookings
    
    # Get user's bookings for current week
    week_start = get_current_week_start()
    user_bookings = await get_user_bookings(db_session, user.sub, week_start)
    
    if not user_bookings:
        await message.answer(_("📅 У вас нет активных бронирований на эту неделю."))
        return
    
    # Format bookings
    bookings_text = _("🎹 **Ваши бронирования:**\n\n")
    for booking in user_bookings:
        date_str = booking.start_datetime.strftime("%d.%m.%Y")
        time_str = booking.start_datetime.strftime("%H:%M")
        end_time_str = booking.end_datetime.strftime("%H:%M")
        bookings_text += f"📅 {date_str} с {time_str} до {end_time_str}\n"
    
    # Show weekly limit info
    weekly_count = await count_user_weekly_bookings(db_session, user.sub, week_start)
    bookings_text += f"\n{_('Использовано слотов на неделю')}: {weekly_count}/2"
    
    await message.answer(bookings_text, parse_mode="Markdown")


@router.message(Command("drop"))
async def show_drop_bookings(
    message: Message,
    db_session: AsyncSession,
    _: Callable[[str], str],
):
    """Show user's bookings with drop options"""
    # Check if user is authenticated
    user = await get_user_by_telegram_id(db_session, message.from_user.id)
    if not user:
        await message.answer(_("❌ Вы не авторизованы. Пожалуйста, пройдите аутентификацию через NUspace."))
        return

    from backend.routes.bot.cruds import get_user_bookings
    from backend.routes.bot.keyboards.kb import piano_user_bookings_keyboard
    
    # Get user's bookings for current week
    week_start = get_current_week_start()
    user_bookings = await get_user_bookings(db_session, user.sub, week_start)
    
    if not user_bookings:
        await message.answer(_("📅 У вас нет активных бронирований для отмены."))
        return
    
    # Prepare bookings for keyboard
    booking_options = []
    for booking in user_bookings:
        date_str = booking.start_datetime.strftime("%d.%m")
        time_str = booking.start_datetime.strftime("%H:%M")
        end_time_str = booking.end_datetime.strftime("%H:%M")
        description = f"{date_str} {time_str}-{end_time_str}"
        booking_options.append((booking.id, description))
    
    keyboard = piano_user_bookings_keyboard(booking_options, _)
    
    await message.answer(
        _("🎹 **Выберите бронирование для отмены:**"),
        reply_markup=keyboard,
        parse_mode="Markdown"
    )


