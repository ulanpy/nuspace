from aiogram import Router, F
from aiogram.types import Message
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from .common import handle_new_member

router = Router()


@router.message(
    ~F.new_chat_members,  # Исключаем сообщения о новых участниках
    ~F.left_chat_member,  # Исключаем сообщения о выходе участников
    ~F.migrate_to_chat_id,  # Исключаем миграцию чата
    ~F.migrate_from_chat_id,
    ~F.chat_shared,  # Исключаем shared чаты
    ~F.user_shared
)
async def user_message(
        m: Message,
        db_session: AsyncSession,
        redis: Redis,
        public_url: str) -> None:
    if m.from_user.is_bot:
        return

    await handle_new_member(
        user_id=m.from_user.id,
        chat_id=m.chat.id,
        bot=m.bot,
        db_session=db_session,
        redis=redis,
        public_url=public_url,
        message=m
    )

