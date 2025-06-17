from aiogram import Bot
from aiogram.exceptions import TelegramForbiddenError, TelegramRetryAfter
from faststream.rabbit import RabbitBroker
from faststream.rabbit.annotations import RabbitMessage

from backend.core.configs.config import config
from backend.routes.notification import schemas

broker: RabbitBroker = RabbitBroker(config.CELERY_BROKER_URL)


@broker.subscriber("notifications")
async def process_notification(notification: schemas.ModifiedNotification, msg: RabbitMessage):
    from backend.routes.bot.keyboards.kb import kb_url

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
        await msg.ack()
    except TelegramForbiddenError:
        await msg.reject()
    except TelegramRetryAfter:
        await msg.nack()
    finally:
        await bot.session.close()
