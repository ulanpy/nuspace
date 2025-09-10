import asyncio
from datetime import datetime, timedelta, timezone

from aiogram import Bot
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from backend.core.configs.config import config
from backend.core.database.models.piano_room import PianoRoomBooking

from .celery_config import celery_app


@celery_app.task
def schedule_kick(chat_id: int, user_id: int, message_id: int):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    async def kick_async(chat_id: int, user_id: int, message_id: int):
        bot = Bot(token=config.TELEGRAM_BOT_TOKEN)
        await bot.ban_chat_member(chat_id, user_id)
        await bot.unban_chat_member(chat_id, user_id)
        await bot.delete_message(chat_id=chat_id, message_id=message_id)

        await bot.session.close()

    try:
        result = loop.run_until_complete(kick_async(chat_id, user_id, message_id))
        return result
    finally:
        loop.close()


@celery_app.task
def weekly_piano_room_reset():
    """Weekly task to reset piano room bookings (mark past bookings as completed)"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    async def reset_async():
        # Create database session
        engine = create_async_engine(config.DATABASE_URL)
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        
        async with async_session() as session:
            # Get current time
            now = datetime.now(timezone.utc)
            
            # Mark all past bookings as completed by setting cancelled_at
            # This effectively removes them from active bookings while keeping history
            query = (
                update(PianoRoomBooking)
                .where(
                    PianoRoomBooking.end_datetime < now,
                    PianoRoomBooking.cancelled_at.is_(None)
                )
                .values(cancelled_at=now)
            )
            
            result = await session.execute(query)
            await session.commit()
            
            print(f"Weekly reset completed: {result.rowcount} past bookings marked as completed")
            
        await engine.dispose()

    try:
        result = loop.run_until_complete(reset_async())
        return result
    finally:
        loop.close()
