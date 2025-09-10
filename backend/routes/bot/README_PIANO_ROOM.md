# Piano Room Booking Bot 🎹

## Overview
The Piano Room Booking Bot allows NU students to book piano room slots through Telegram. The system provides transparent slot management, automatic authentication, and weekly schedule resets.

## Features

### 🔐 Authentication
- Only students with `@nu.edu.kz` email can use the bot
- Users must authenticate through NUspace website and link their Telegram account
- Bot automatically knows user's name and surname (no manual input required)

### 📅 Booking Management
- **`/schedule`** - View weekly schedule and book available slots
- **`/mybookings`** - View your current bookings
- **`/drop`** - Cancel your bookings

### 🕐 Time Slots
- Piano room operates from 9:00 AM to 10:00 PM daily
- Each booking slot is exactly 1 hour
- Users can book maximum 2 slots per week
- Schedule resets every Monday at 08:00 UTC

### 🔄 Automatic Features
- Weekly schedule reset (every Monday)
- Automatic cleanup of past bookings
- Real-time slot availability checking
- Booking conflict prevention

## Bot Commands

### `/schedule`
Shows the current week's piano room schedule with:
- Available and occupied time slots for each day
- Interactive day selection
- Time slot booking interface

### `/mybookings`
Displays user's active bookings including:
- Date and time of each booking
- Weekly usage counter (X/2 slots)

### `/drop`
Shows user's bookings with cancel options:
- Interactive booking selection
- One-click cancellation
- Immediate slot release

## Technical Implementation

### Database Model
```python
class PianoRoomBooking(Base):
    id: int (primary key)
    reservator_sub: str (foreign key to users.sub)
    start_datetime: datetime
    end_datetime: datetime
    created_at: datetime
    updated_at: datetime
    cancelled_at: datetime (nullable)
```

### Key Components
- **CRUD Operations**: Full booking lifecycle management
- **Keyboard Interfaces**: Interactive day/time selection
- **Validation Logic**: Booking limits and conflict checking
- **Scheduled Tasks**: Weekly cleanup via Celery
- **Utility Functions**: Time management and formatting

### Booking Flow
1. User runs `/schedule`
2. Bot shows weekly overview
3. User selects day → available hours shown
4. User selects time → confirmation dialog
5. User confirms → booking created
6. Success message with booking details

### Cancellation Flow
1. User runs `/drop`
2. Bot shows user's active bookings
3. User selects booking to cancel
4. Booking cancelled, slot becomes available

## Configuration

### Operating Hours
- Default: 9:00 AM - 10:00 PM
- Configurable in `piano_utils.py`

### Weekly Limits
- Maximum 2 bookings per user per week
- Enforced at booking creation time

### Schedule Reset
- Every Monday at 08:00 UTC
- Automated via Celery beat scheduler
- Past bookings marked as completed (keeps history)

## Files Structure
```
backend/routes/bot/
├── cruds.py                    # Piano room CRUD operations
├── utils/piano_utils.py        # Utility functions
├── keyboards/
│   ├── callback_factory.py    # Callback data classes
│   └── kb.py                   # Keyboard generators
└── routes/user/private/
    ├── messages/piano_room.py  # Command handlers
    └── callback/piano_room.py  # Callback handlers

backend/celery_app/
├── tasks.py                    # Weekly reset task
└── celery_config.py           # Scheduler configuration
```

## Usage Examples

### Booking a Slot
```
User: /schedule
Bot: [Shows weekly schedule with interactive buttons]
User: [Clicks "Tuesday (15.01)"]
Bot: [Shows available hours: 10:00-11:00, 14:00-15:00, ...]
User: [Clicks "14:00-15:00"]
Bot: [Shows confirmation dialog]
User: [Clicks "✅ Подтвердить"]
Bot: "✅ Booking confirmed! Tuesday 15.01.2024 14:00-15:00"
```

### Viewing Bookings
```
User: /mybookings
Bot: "🎹 Your bookings:
📅 15.01.2024 14:00-15:00
📅 17.01.2024 10:00-11:00

Used slots this week: 2/2"
```

### Cancelling a Booking
```
User: /drop
Bot: [Shows bookings with cancel buttons]
User: [Clicks "❌ 15.01 14:00-15:00"]
Bot: "✅ Booking cancelled! Slot is now available for others."
```

## Error Handling
- Authentication checks on all operations
- Real-time availability validation
- Weekly booking limit enforcement
- Graceful error messages in Russian
- Automatic conflict resolution

## Localization
- All user-facing messages support Russian localization
- Uses the bot's translation system (`_()` function)
- Consistent date/time formatting

This implementation provides a complete, production-ready piano room booking system integrated with the existing bot infrastructure.


