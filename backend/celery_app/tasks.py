from .celery_config import celery_app
from backend.core.configs.config import  config
from aiogram import Bot
import asyncio


@celery_app.task
def schedule_kick(chat_id: int, user_id: int):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    async def kick_async(chat_id: int, user_id: int):
        bot = Bot(token=config.TG_API_KEY)
        await bot.ban_chat_member(chat_id, user_id)
        await bot.unban_chat_member(chat_id, user_id)

    try:
        result = loop.run_until_complete(kick_async(chat_id, user_id))
        return result
    finally:
        loop.close()



