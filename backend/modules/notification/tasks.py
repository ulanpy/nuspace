from aiogram import Bot
from aiogram.exceptions import TelegramForbiddenError, TelegramRetryAfter
from faststream.rabbit import RabbitBroker
from faststream.rabbit.annotations import RabbitMessage

from backend.core.configs.config import config
from backend.modules.notification import schemas
from backend.modules.notification.rate_limiter import TelegramRateLimiter

broker = RabbitBroker(config.CELERY_BROKER_URL) # declared only once

rate_limiter = TelegramRateLimiter(global_rate_per_sec=30, per_chat_min_interval=1.0)


@broker.subscriber("notifications")
async def process_notification(notification: schemas._RequestNotification, msg: RabbitMessage):
    from backend.modules.bot.keyboards.kb import kb_url

    if not notification.switch:
        return
    if not notification.tg_id:
        await msg.ack()
        return
    bot = Bot(token=config.TELEGRAM_BOT_TOKEN)
    message = f"{notification.title}\n\n{notification.message}"
    try:
        await rate_limiter.wait(notification.tg_id)
        await bot.send_message(
            notification.tg_id,
            message,
            reply_markup=kb_url(notification.url) if notification.url else None,
        )
        await msg.ack()
    except TelegramForbiddenError:
        await msg.reject()
    except TelegramRetryAfter:
        await msg.nack()
    finally:
        await bot.session.close()
