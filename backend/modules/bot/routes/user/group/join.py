from aiogram import F, Router
from aiogram.types import ChatMemberUpdated
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from .common import handle_new_member

router = Router()


@router.chat_member(
    (not F.old_chat_member.is_member) & F.new_chat_member.is_member
    | (F.old_chat_member.status == "left") & (F.new_chat_member.status == "member")
)
async def on_user_joined(
    event: ChatMemberUpdated, db_session: AsyncSession, redis: Redis, public_url: str
) -> None:
    if event.new_chat_member.user.is_bot:
        return

    await handle_new_member(
        user_id=event.new_chat_member.user.id,
        chat_id=event.chat.id,
        bot=event.bot,
        db_session=db_session,
        redis=redis,
        public_url=public_url,
    )
