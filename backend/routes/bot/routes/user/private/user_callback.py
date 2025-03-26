from aiogram import Router
from aiogram.types import CallbackQuery
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis
from celery.result import AsyncResult

from backend.routes.bot.utils import yes_permissions
from backend.celery_app.celery_config import celery_app
from backend.routes.bot.keyboards.callback_factory import ConfirmTelegramUser
from backend.routes.bot.cruds import set_telegram_id, get_telegram_id

router = Router(name="Private callback router")


@router.callback_query(ConfirmTelegramUser.filter())
async def confirmation_buttons(c: CallbackQuery,
                               callback_data: ConfirmTelegramUser,
                               db_session: AsyncSession,
                               redis: Redis) -> None:
    """
        Handles the callback query for Telegram user confirmation.
        Checks if the user is already authorized by their sub (unique identifier).
        If the confirmation number matches, updates the user's Telegram ID in the database.
        If the confirmation number is incorrect, notifies the user.
        Deletes the confirmation message after processing.
    """

    if await get_telegram_id(session=db_session, sub=callback_data.sub) is not None:
        await c.message.answer("Уже авторизирован!")
        await c.message.delete()
        return

    if callback_data.number == callback_data.confirmation_number:
        user_id = await set_telegram_id(session=db_session,
                                        sub=callback_data.sub,
                                        user_id=c.from_user.id)
        keys = [key async for key in redis.scan_iter(f"celery:kick:{user_id}:*")]
        for key in keys:
            _, _, user_id, chat_id, msg_id = key.split(":")
            result = AsyncResult(key, app=celery_app)
            result.revoke(terminate=True)
            await redis.delete(key)
            await c.message.bot.restrict_chat_member(chat_id=chat_id, user_id=user_id, permissions=yes_permissions)
            await c.message.bot.delete_message(chat_id=chat_id, message_id=msg_id)
        await c.message.answer(f"Телеграм аккаунт успешно привязан!")
    else:
        await c.message.answer("Введенный вами символ неверный!")
    await c.message.delete()