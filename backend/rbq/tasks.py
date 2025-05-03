import json

from aio_pika.abc import AbstractIncomingMessage
from aiogram import Bot
from aiogram.exceptions import TelegramForbiddenError

from backend.core.configs.config import config
from backend.rbq.schemas import Notification
from backend.routes.bot.keyboards.kb import kb_url


async def task(message: AbstractIncomingMessage):
    notification = Notification(**json.loads(message.body.decode("utf-8")))
    bot = Bot(token=config.TG_API_KEY)
    try:
        await bot.send_message(
            notification.user_id,
            f"Notification:\n{notification.text}",
            reply_markup=kb_url(notification.url),
        )
        await message.ack()
    except TelegramForbiddenError:
        await message.nack(requeue=False)
    finally:
        await bot.session.close()
