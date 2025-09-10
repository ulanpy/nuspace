from datetime import datetime, timedelta
from typing import Callable

from aiogram import Router
from aiogram.types import CallbackQuery
from sqlalchemy.ext.asyncio import AsyncSession

from backend.routes.bot.cruds import (
    get_user_by_telegram_id,
    get_weekly_bookings,
    check_time_slot_available,
    create_piano_booking,
    count_user_weekly_bookings,
    cancel_booking,
    get_booking_by_id,
)
from backend.routes.bot.keyboards.callback_factory import (
    PianoScheduleDay,
    PianoTimeSlot,
    PianoBookingConfirm,
    PianoDropConfirm,
)
from backend.routes.bot.keyboards.kb import (
    piano_weekly_schedule_keyboard,
    piano_time_slots_keyboard,
    piano_booking_confirmation_keyboard,
)
from backend.routes.bot.utils.piano_utils import (
    get_current_week_start,
    get_week_days_list,
    get_available_hours_for_day,
    format_booking_time,
)

router = Router()


@router.callback_query(PianoScheduleDay.filter())
async def handle_schedule_day_selection(
    callback: CallbackQuery,
    callback_data: PianoScheduleDay,
    db_session: AsyncSession,
    _: Callable[[str], str],
):
    """Handle day selection from schedule"""
    await callback.answer()
    
    # Check if user is authenticated
    user = await get_user_by_telegram_id(db_session, callback.from_user.id)
    if not user:
        await callback.message.edit_text(_("❌ Вы не авторизованы. Пожалуйста, пройдите аутентификацию через NUspace."))
        return

    # Check weekly booking limit
    week_start = get_current_week_start()
    weekly_count = await count_user_weekly_bookings(db_session, user.sub, week_start)
    if weekly_count >= 2:
        await callback.message.edit_text(
            _("❌ Вы уже достигли лимита в 2 бронирования на неделю.\n\n"
              "Используйте команду /drop для отмены существующих бронирований.")
        )
        return

    # Get available time slots for the selected day
    weekly_bookings = await get_weekly_bookings(db_session, week_start)
    available_hours = get_available_hours_for_day(callback_data.date, weekly_bookings)
    
    if not available_hours:
        # Create back button to return to schedule
        week_days = get_week_days_list(week_start)
        keyboard = piano_weekly_schedule_keyboard(week_days, _)
        
        selected_date = datetime.strptime(callback_data.date, "%Y-%m-%d")
        day_name = selected_date.strftime("%A, %d.%m")
        
        await callback.message.edit_text(
            f"❌ **{day_name}**\n\n{_('На этот день нет свободных слотов.')}\n\n{_('Выберите другой день:')}",
            reply_markup=keyboard,
            parse_mode="Markdown"
        )
        return
    
    # Show available time slots
    keyboard = piano_time_slots_keyboard(callback_data.date, available_hours, _)
    selected_date = datetime.strptime(callback_data.date, "%Y-%m-%d")
    day_name = selected_date.strftime("%A, %d.%m")
    
    await callback.message.edit_text(
        f"🎹 **{day_name}**\n\n{_('Выберите время для бронирования:')}",
        reply_markup=keyboard,
        parse_mode="Markdown"
    )


@router.callback_query(PianoTimeSlot.filter())
async def handle_time_slot_selection(
    callback: CallbackQuery,
    callback_data: PianoTimeSlot,
    db_session: AsyncSession,
    _: Callable[[str], str],
):
    """Handle time slot selection"""
    await callback.answer()
    
    # Check if user is authenticated
    user = await get_user_by_telegram_id(db_session, callback.from_user.id)
    if not user:
        await callback.message.edit_text(_("❌ Вы не авторизованы. Пожалуйста, пройдите аутентификацию через NUspace."))
        return

    # Create datetime objects for the booking
    booking_date = datetime.strptime(callback_data.date, "%Y-%m-%d")
    start_datetime = booking_date.replace(hour=callback_data.hour, minute=0, second=0, microsecond=0)
    end_datetime = start_datetime + timedelta(hours=1)
    
    # Double-check slot availability
    if not await check_time_slot_available(db_session, start_datetime, end_datetime):
        await callback.message.edit_text(_("❌ Выбранный слот уже занят. Пожалуйста, выберите другое время."))
        return
    
    # Show confirmation
    keyboard = piano_booking_confirmation_keyboard(callback_data.date, callback_data.hour, _)
    booking_time_text = format_booking_time(start_datetime, end_datetime)
    
    await callback.message.edit_text(
        f"🎹 **{_('Подтверждение бронирования')}**\n\n"
        f"📅 {booking_time_text}\n\n"
        f"{_('Подтвердить бронирование?')}",
        reply_markup=keyboard,
        parse_mode="Markdown"
    )


@router.callback_query(PianoBookingConfirm.filter())
async def handle_booking_confirmation(
    callback: CallbackQuery,
    callback_data: PianoBookingConfirm,
    db_session: AsyncSession,
    _: Callable[[str], str],
):
    """Handle booking confirmation"""
    await callback.answer()
    
    # Check if user is authenticated
    user = await get_user_by_telegram_id(db_session, callback.from_user.id)
    if not user:
        await callback.message.edit_text(_("❌ Вы не авторизованы. Пожалуйста, пройдите аутентификацию через NUspace."))
        return

    # Check weekly booking limit again
    week_start = get_current_week_start()
    weekly_count = await count_user_weekly_bookings(db_session, user.sub, week_start)
    if weekly_count >= 2:
        await callback.message.edit_text(
            _("❌ Вы уже достигли лимита в 2 бронирования на неделю.")
        )
        return

    # Create datetime objects
    booking_date = datetime.strptime(callback_data.date, "%Y-%m-%d")
    start_datetime = booking_date.replace(hour=callback_data.hour, minute=0, second=0, microsecond=0)
    end_datetime = start_datetime + timedelta(hours=1)
    
    # Final availability check
    if not await check_time_slot_available(db_session, start_datetime, end_datetime):
        await callback.message.edit_text(_("❌ Выбранный слот уже занят. Пожалуйста, попробуйте снова."))
        return
    
    # Create the booking
    try:
        booking = await create_piano_booking(db_session, user.sub, start_datetime, end_datetime)
        booking_time_text = format_booking_time(start_datetime, end_datetime)
        
        # Update weekly count for display
        new_weekly_count = weekly_count + 1
        
        await callback.message.edit_text(
            f"✅ **{_('Бронирование подтверждено!')}**\n\n"
            f"🎹 Piano Room\n"
            f"📅 {booking_time_text}\n\n"
            f"{_('Использовано слотов на неделю')}: {new_weekly_count}/2\n\n"
            f"{_('Используйте /mybookings для просмотра всех ваших бронирований.')}\n"
            f"{_('Используйте /drop для отмены бронирований.')}",
            parse_mode="Markdown"
        )
        
    except Exception as e:
        await callback.message.edit_text(
            f"❌ {_('Ошибка при создании бронирования. Пожалуйста, попробуйте снова.')}"
        )


@router.callback_query(PianoDropConfirm.filter())
async def handle_booking_drop(
    callback: CallbackQuery,
    callback_data: PianoDropConfirm,
    db_session: AsyncSession,
    _: Callable[[str], str],
):
    """Handle booking cancellation"""
    await callback.answer()
    
    # Check if user is authenticated
    user = await get_user_by_telegram_id(db_session, callback.from_user.id)
    if not user:
        await callback.message.edit_text(_("❌ Вы не авторизованы. Пожалуйста, пройдите аутентификацию через NUspace."))
        return

    # Get the booking to verify it belongs to the user
    booking = await get_booking_by_id(db_session, callback_data.booking_id, user.sub)
    if not booking:
        await callback.message.edit_text(_("❌ Бронирование не найдено или уже отменено."))
        return
    
    # Cancel the booking
    success = await cancel_booking(db_session, callback_data.booking_id, user.sub)
    
    if success:
        booking_time_text = format_booking_time(booking.start_datetime, booking.end_datetime)
        
        await callback.message.edit_text(
            f"✅ **{_('Бронирование отменено!')}**\n\n"
            f"🎹 Piano Room\n"
            f"📅 {booking_time_text}\n\n"
            f"{_('Слот освобожден и доступен для других пользователей.')}\n\n"
            f"{_('Используйте /schedule для нового бронирования.')}",
            parse_mode="Markdown"
        )
    else:
        await callback.message.edit_text(
            f"❌ {_('Ошибка при отмене бронирования. Пожалуйста, попробуйте снова.')}"
        )


@router.callback_query(lambda c: c.data == "piano_back_to_schedule")
async def handle_back_to_schedule(
    callback: CallbackQuery,
    db_session: AsyncSession,
    _: Callable[[str], str],
):
    """Handle back to schedule button"""
    await callback.answer()
    
    # Get current week schedule
    week_start = get_current_week_start()
    week_days = get_week_days_list(week_start)
    weekly_bookings = await get_weekly_bookings(db_session, week_start)
    
    from backend.routes.bot.utils.piano_utils import format_weekly_schedule
    schedule_text = format_weekly_schedule(weekly_bookings, week_days, _)
    
    keyboard = piano_weekly_schedule_keyboard(week_days, _)
    
    await callback.message.edit_text(
        f"🎹 **{_('Расписание Piano Room')}**\n\n{schedule_text}\n\n{_('Выберите день для бронирования:')}",
        reply_markup=keyboard,
        parse_mode="Markdown"
    )
