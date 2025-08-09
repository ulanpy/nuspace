from aiogram import F, Router
from aiogram.types import ChatMemberUpdated
from celery.result import AsyncResult
from redis.asyncio import Redis

from backend.celery_app.celery_config import celery_app

router = Router()


@router.chat_member((F.old_chat_member.is_member == True) & (F.new_chat_member.is_member == False))
async def on_user_left(event: ChatMemberUpdated, redis: Redis) -> None:
    user_id = event.old_chat_member.user.id
    chat_id = event.chat.id
    keys = [key async for key in redis.scan_iter(f"celery:kick:{user_id}:{chat_id}:*")]
    for key in keys:
        _, _, _, _, msg_id = key.split(":")
        result = AsyncResult(key, app=celery_app)
        result.revoke(terminate=True)
        await redis.delete(key)
        await event.bot.delete_message(chat_id=chat_id, message_id=msg_id)
