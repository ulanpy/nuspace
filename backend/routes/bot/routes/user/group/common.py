
from aiogram import F, Bot
from aiogram.types import Message, ChatMemberOwner, ChatMemberUpdated, ChatMemberAdministrator
from aiogram.enums.chat_type import ChatType
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis

from backend.routes.bot.utils import no_permissions
from backend.routes.bot.keyboards.kb import kb_register_groups
from backend.routes.bot.cruds import check_user_by_telegram_id
from backend.celery_app.tasks import schedule_kick


async def handle_new_member(
    user_id: int,
    chat_id: int,
    bot: Bot,
    db_session: AsyncSession,
    redis: Redis,
    public_url: str,
    message: Message = None
):
    if user_id == bot.id:
        return

    member = await bot.get_chat_member(chat_id=chat_id, user_id=user_id)
    if isinstance(member, (ChatMemberOwner, ChatMemberAdministrator)):
        return

    if not await check_user_by_telegram_id(session=db_session, user_id=user_id):
        sent_m = await bot.send_message(
            chat_id=chat_id,
            text="Зарегайся в NUspace, иначе в течений 15 минут будешь исключен",
            reply_markup=kb_register_groups(url=public_url),
            reply_to_message_id=message.message_id if message else None
        )
        await bot.restrict_chat_member(
            chat_id=chat_id,
            user_id=user_id,
            permissions=no_permissions
        )
        task_id = f"celery:kick:{user_id}:{chat_id}:{sent_m.message_id}"
        await redis.set(task_id, "pending", ex=15*60+1)
        schedule_kick.apply_async(
            args=[chat_id, user_id, sent_m.message_id],
            countdown=900,
            task_id=task_id
        )
