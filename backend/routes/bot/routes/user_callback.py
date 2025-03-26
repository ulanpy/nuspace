from aiogram import Router
from aiogram.types import CallbackQuery
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis
from celery.result import AsyncResult
from aiogram.types.chat_permissions import ChatPermissions

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
    user_id = c.from_user.id
    if await get_telegram_id(session=db_session, sub=callback_data.sub) is not None:
        await c.message.answer("Уже авторизирован!")
        await c.message.delete()
        return

    if callback_data.number == callback_data.confirmation_number:
        telegram_id = await set_telegram_id(session=db_session,
                                             sub=callback_data.sub,
                                             user_id=user_id)
        await c.message.answer(f"Correct: {telegram_id}")
        keys = []
        async for key in redis.scan_iter(f"celery:kick:{c.from_user.id}:*"):
            keys.append(key)
        await c.message.answer(str(keys))
        for key in keys:
            result = AsyncResult(key, app=celery_app)
            result.revoke(terminate=True)
            await redis.delete(key)
            await c.message.bot.restrict_chat_member(chat_id=key.split(":")[3],
                                             user_id=key.split(":")[2],
                                             permissions=ChatPermissions(
                                                 can_send_messages=True,
                                                 can_send_audios=False,
                                                 can_send_documents=False,
                                                 can_send_photos=True,
                                                 can_send_videos=True,
                                                 can_send_video_notes=True,
                                                 can_send_voice_notes=True,
                                                 can_send_polls=True,
                                                 can_send_other_messages=False,
                                                 can_add_web_page_previews=False,
                                                 can_change_info=False,
                                                 can_invite_users=False,
                                                 can_pin_messages=False,
                                                 can_manage_topics=False
                                             )
                                             )
            await c.message.bot.delete_message(chat_id=key.split(":")[3], message_id=key.split(":")[4])
    else:
        await c.message.answer("Incorrect")
    await c.message.delete()