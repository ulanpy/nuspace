from datetime import datetime, timedelta
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.core.database.models import Media, User
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.product import Product, ProductStatus
from backend.core.database.models.piano_room import PianoRoomBooking


async def get_telegram_id(session: AsyncSession, sub: str) -> int | None:
    result = await session.execute(select(User.telegram_id).filter_by(sub=sub))
    user_id: int | None = result.scalars().first()
    return user_id


async def check_existance_by_sub(session: AsyncSession, sub: str) -> bool:
    result = await session.execute(select(User.sub).filter_by(sub=sub))
    user = result.scalars().first()
    return True if user else False


async def set_telegram_id(session: AsyncSession, sub: str, user_id: int) -> int:
    result = await session.execute(select(User).filter_by(sub=sub))
    user = result.scalars().first()
    user.telegram_id = user_id
    await session.commit()
    return user_id


async def check_user_by_telegram_id(session: AsyncSession, user_id: int) -> bool:
    result = await session.execute(select(User.email).filter_by(telegram_id=user_id))
    user_email = result.scalars().first()
    return bool(user_email)


async def find_media(
    session: AsyncSession,
    product_id: int,
    media_order: int = 0,
    entity_type: EntityType = EntityType.products,
) -> Media | None:
    query = select(Media).filter(
        Media.entity_id == product_id,
        Media.media_order == media_order,
        Media.entity_type == entity_type,
    )
    result = await session.execute(query)
    media = result.scalars().first()
    return media


async def find_product(session: AsyncSession, product_id: int) -> Product | None:
    query = (
        select(Product)
        .options(selectinload(Product.user))
        .filter(Product.id == product_id, Product.status == ProductStatus.active.value)
    )
    result = await session.execute(query)
    product = result.scalars().first()
    return product


# Piano Room Booking CRUD operations

async def get_user_by_telegram_id(session: AsyncSession, telegram_id: int) -> User | None:
    """Get user by telegram ID"""
    result = await session.execute(select(User).filter_by(telegram_id=telegram_id))
    user = result.scalars().first()
    return user


async def create_piano_booking(
    session: AsyncSession,
    user_sub: str,
    start_datetime: datetime,
    end_datetime: datetime
) -> PianoRoomBooking:
    """Create a new piano room booking"""
    booking = PianoRoomBooking(
        reservator_sub=user_sub,
        start_datetime=start_datetime,
        end_datetime=end_datetime
    )
    session.add(booking)
    await session.commit()
    await session.refresh(booking)
    return booking


async def get_user_bookings(
    session: AsyncSession, 
    user_sub: str, 
    week_start: datetime | None = None
) -> list[PianoRoomBooking]:
    """Get user's active bookings for the current week"""
    query = select(PianoRoomBooking).filter(
        PianoRoomBooking.reservator_sub == user_sub,
        PianoRoomBooking.cancelled_at.is_(None)
    )
    
    if week_start:
        week_end = week_start + timedelta(days=7)
        query = query.filter(
            PianoRoomBooking.start_datetime >= week_start,
            PianoRoomBooking.start_datetime < week_end
        )
    
    result = await session.execute(query.order_by(PianoRoomBooking.start_datetime))
    return list(result.scalars().all())


async def get_weekly_bookings(
    session: AsyncSession, 
    week_start: datetime
) -> list[PianoRoomBooking]:
    """Get all active bookings for a specific week"""
    week_end = week_start + timedelta(days=7)
    query = select(PianoRoomBooking).filter(
        PianoRoomBooking.start_datetime >= week_start,
        PianoRoomBooking.start_datetime < week_end,
        PianoRoomBooking.cancelled_at.is_(None)
    )
    result = await session.execute(query.order_by(PianoRoomBooking.start_datetime))
    return list(result.scalars().all())


async def check_time_slot_available(
    session: AsyncSession,
    start_datetime: datetime,
    end_datetime: datetime
) -> bool:
    """Check if a time slot is available"""
    query = select(PianoRoomBooking).filter(
        and_(
            PianoRoomBooking.cancelled_at.is_(None),
            PianoRoomBooking.start_datetime < end_datetime,
            PianoRoomBooking.end_datetime > start_datetime
        )
    )
    result = await session.execute(query)
    existing_booking = result.scalars().first()
    return existing_booking is None


async def cancel_booking(session: AsyncSession, booking_id: int, user_sub: str) -> bool:
    """Cancel a booking by setting cancelled_at timestamp"""
    query = select(PianoRoomBooking).filter(
        PianoRoomBooking.id == booking_id,
        PianoRoomBooking.reservator_sub == user_sub,
        PianoRoomBooking.cancelled_at.is_(None)
    )
    result = await session.execute(query)
    booking = result.scalars().first()
    
    if booking:
        booking.cancelled_at = datetime.utcnow()
        await session.commit()
        return True
    return False


async def count_user_weekly_bookings(
    session: AsyncSession,
    user_sub: str,
    week_start: datetime
) -> int:
    """Count user's bookings for a specific week (including completed ones)"""
    week_end = week_start + timedelta(days=7)
    query = select(func.count(PianoRoomBooking.id)).filter(
        PianoRoomBooking.reservator_sub == user_sub,
        PianoRoomBooking.start_datetime >= week_start,
        PianoRoomBooking.start_datetime < week_end,
        PianoRoomBooking.cancelled_at.is_(None)
    )
    result = await session.execute(query)
    return result.scalar() or 0


async def get_booking_by_id(
    session: AsyncSession,
    booking_id: int,
    user_sub: str
) -> PianoRoomBooking | None:
    """Get a specific booking by ID and user"""
    query = select(PianoRoomBooking).filter(
        PianoRoomBooking.id == booking_id,
        PianoRoomBooking.reservator_sub == user_sub,
        PianoRoomBooking.cancelled_at.is_(None)
    )
    result = await session.execute(query)
    return result.scalars().first()
