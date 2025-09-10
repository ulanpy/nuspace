from datetime import datetime, timedelta
from typing import Callable

from backend.core.database.models.piano_room import PianoRoomBooking


def get_current_week_start() -> datetime:
    """Get the start of current week (Monday 00:00)"""
    now = datetime.utcnow()
    # Get Monday of current week
    days_since_monday = now.weekday()
    week_start = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days_since_monday)
    return week_start


def get_week_days_list(week_start: datetime) -> list[tuple[str, str]]:
    """Get list of week days with date strings and day names
    
    Returns:
        List of tuples (date_str, day_name) where date_str is YYYY-MM-DD format
    """
    days = []
    day_names = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"]
    
    for i in range(7):
        date = week_start + timedelta(days=i)
        date_str = date.strftime("%Y-%m-%d")
        day_name = f"{day_names[i]} ({date.strftime('%d.%m')})"
        days.append((date_str, day_name))
    
    return days


def get_available_hours_for_day(
    date_str: str, 
    existing_bookings: list[PianoRoomBooking],
    operating_hours: tuple[int, int] = (9, 22)  # 9 AM to 10 PM
) -> list[int]:
    """Get available hours for a specific day
    
    Args:
        date_str: Date in YYYY-MM-DD format
        existing_bookings: List of existing bookings for the week
        operating_hours: Tuple of (start_hour, end_hour) for piano room operation
    
    Returns:
        List of available hours (0-23)
    """
    target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    
    # Get all occupied hours for the target date
    occupied_hours = set()
    for booking in existing_bookings:
        if booking.start_datetime.date() == target_date:
            # Add all hours from start to end (exclusive)
            start_hour = booking.start_datetime.hour
            end_hour = booking.end_datetime.hour
            for hour in range(start_hour, end_hour):
                occupied_hours.add(hour)
    
    # Generate available hours within operating hours
    start_hour, end_hour = operating_hours
    available_hours = []
    for hour in range(start_hour, end_hour):
        if hour not in occupied_hours:
            available_hours.append(hour)
    
    return available_hours


def format_weekly_schedule(
    bookings: list[PianoRoomBooking], 
    week_days: list[tuple[str, str]], 
    _: Callable[[str], str]
) -> str:
    """Format weekly schedule for display
    
    Args:
        bookings: List of bookings for the week
        week_days: List of (date_str, day_name) tuples
        _: Translation function
    
    Returns:
        Formatted schedule text
    """
    schedule_lines = []
    
    for date_str, day_name in week_days:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        
        # Find bookings for this day
        day_bookings = [b for b in bookings if b.start_datetime.date() == target_date]
        
        if day_bookings:
            # Sort bookings by time
            day_bookings.sort(key=lambda x: x.start_datetime)
            
            occupied_slots = []
            for booking in day_bookings:
                start_time = booking.start_datetime.strftime("%H:%M")
                end_time = booking.end_datetime.strftime("%H:%M")
                occupied_slots.append(f"{start_time}-{end_time}")
            
            slots_text = ", ".join(occupied_slots)
            schedule_lines.append(f"📅 **{day_name.split(' ')[0]}**: {slots_text}")
        else:
            schedule_lines.append(f"📅 **{day_name.split(' ')[0]}**: {_('Свободно')}")
    
    return "\n".join(schedule_lines)


def format_booking_time(start_datetime: datetime, end_datetime: datetime) -> str:
    """Format booking time for display"""
    date_str = start_datetime.strftime("%d.%m.%Y")
    start_time = start_datetime.strftime("%H:%M")
    end_time = end_datetime.strftime("%H:%M")
    return f"{date_str} с {start_time} до {end_time}"


def is_booking_time_valid(start_datetime: datetime, end_datetime: datetime) -> bool:
    """Check if booking time is valid (correct duration and basic time validation)"""
    # Check if booking duration is exactly 1 hour
    expected_end = start_datetime + timedelta(hours=1)
    if end_datetime != expected_end:
        return False
    
    # Check if the booking is for today or future dates
    # We'll be lenient about time zones and just check the date
    today = datetime.utcnow().date()
    booking_date = start_datetime.date()
    
    # Allow bookings for today and future dates
    if booking_date < today:
        return False
    
    # Check operating hours (9 AM to 10 PM, so last slot starts at 9 PM)
    if start_datetime.hour < 9 or start_datetime.hour >= 22:
        return False
    
    return True


def get_week_range_text(week_start: datetime, _: Callable[[str], str]) -> str:
    """Get formatted week range text"""
    week_end = week_start + timedelta(days=6)
    start_str = week_start.strftime("%d.%m")
    end_str = week_end.strftime("%d.%m.%Y")
    return f"{start_str} - {end_str}"
