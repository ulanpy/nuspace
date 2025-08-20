from typing import Callable

from aiogram import Router
from aiogram.types import CallbackQuery
from celery.result import AsyncResult
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from backend.celery_app.celery_config import celery_app
from backend.routes.bot.cruds import set_telegram_id
from backend.routes.bot.keyboards.callback_factory import ConfirmTelegramUser
from backend.routes.bot.utils.permissions import all_permissions

router = Router()


@router.callback_query(ConfirmTelegramUser.filter())
async def confirmation_buttons(
    c: CallbackQuery,
    callback_data: ConfirmTelegramUser,
    db_session: AsyncSession,
    redis: Redis,
    _: Callable[[str], str],
) -> None:

    if callback_data.number == callback_data.confirmation_number:
        user_id = await set_telegram_id(
            session=db_session, sub=callback_data.sub, user_id=c.from_user.id
        )
        keys = [key async for key in redis.scan_iter(f"celery:kick:{user_id}:*")]
        for key in keys:
            _, _, user_id, chat_id, msg_id = key.split(":")
            result = AsyncResult(key, app=celery_app)
            result.revoke(terminate=True)
            await redis.delete(key)
            await c.message.bot.restrict_chat_member(
                chat_id=chat_id, user_id=user_id, permissions=all_permissions
            )
            await c.message.bot.delete_message(chat_id=chat_id, message_id=msg_id)
        await c.message.answer(_("Телеграм аккаунт успешно привязан!"))
    else:
        await c.message.answer(_("Введенный вами символ неверный!"))
    await c.message.delete()
