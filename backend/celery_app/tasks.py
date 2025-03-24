from .celery_config import celery_app
from backend.core.configs.config import  config
from aiogram import Bot
import asyncio
from backend.routes.bot.apsheduler.tasks import kick_user


@celery_app.task
def schedule_kick(chat_id: int, user_id: int):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    async def kick_async(chat_id: int, user_id: int):
        bot = Bot(token=config.TG_API_KEY)
        await kick_user(chat_id, user_id, bot)

    try:
        result = loop.run_until_complete(kick_async(chat_id, user_id))
        return result
    finally:
        loop.close()



