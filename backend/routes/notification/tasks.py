import json

from aio_pika.abc import AbstractIncomingMessage
from aiogram import Bot
from aiogram.exceptions import TelegramForbiddenError, TelegramRetryAfter

from backend.core.configs.config import config
from backend.routes.bot.keyboards.kb import kb_url
from backend.routes.notification import schemas


async def task(message: AbstractIncomingMessage):
    notification: schemas.BaseNotification = schemas.ModifiedNotification(
        **json.loads(message.body.decode("utf-8"))
    )
    if not notification.switch:
        return
    bot = Bot(token=config.TG_API_KEY)
    try:
        await bot.send_message(
            notification.tg_id,
            f"Title: {notification.title}"
            f"\nNotification: {notification.message}"
            f"\nFrom service: {notification.notification_source}",
            reply_markup=kb_url(notification.url) if notification.url else None,
        )
        await message.ack()
    except TelegramForbiddenError:
        await message.nack(requeue=False)
    except TelegramRetryAfter:
        await message.nack(requeue=True)
    finally:
        await bot.session.close()
