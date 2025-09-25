from aiogram import Bot
from aiogram.exceptions import TelegramForbiddenError, TelegramRetryAfter
from faststream.rabbit import RabbitBroker
from faststream.rabbit.annotations import RabbitMessage

from backend.core.configs.config import config
from backend.modules.notification import schemas

broker = RabbitBroker(config.CELERY_BROKER_URL) # declared only once


@broker.subscriber("notifications")
async def process_notification(notification: schemas._RequestNotification, msg: RabbitMessage):
    from backend.modules.bot.keyboards.kb import kb_url

    if not notification.switch:
        return
    bot = Bot(token=config.TELEGRAM_BOT_TOKEN)
    message = f"*{notification.title}*\n\n_{notification.message}_"
    try:
        await bot.send_message(
            notification.tg_id,
            message,
            reply_markup=kb_url(notification.url) if notification.url else None,
            parse_mode="Markdown",
        )
        await msg.ack()
    except TelegramForbiddenError:
        await msg.reject()
    except TelegramRetryAfter:
        await msg.nack()
    finally:
        await bot.session.close()
