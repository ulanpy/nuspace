from aiogram import Bot, Router
from aiogram.filters import Command
from aiogram.filters.chat_member_updated import JOIN_TRANSITION, ChatMemberUpdatedFilter
from aiogram.types import ChatMemberUpdated, Message
from redis.asyncio import Redis

from backend.modules.bot.consts import KILLSWITCH_OWNER_ID
from backend.modules.bot.filters.owner import OwnerFilter
from backend.modules.bot.services.killswitch import (
    disable_killswitch,
    enable_killswitch,
    is_killswitch_enabled,
)

router = Router(name="Killswitch router")


@router.message(Command("killswitch"), OwnerFilter())
async def killswitch_toggle(message: Message, redis: Redis) -> None:
    if await is_killswitch_enabled(redis):
        await disable_killswitch(redis)
        await message.answer("Killswitch выключен.")
        return

    await enable_killswitch(redis)
    await message.answer("Killswitch включён — новых участников баним.")


@router.chat_member(ChatMemberUpdatedFilter(JOIN_TRANSITION))
async def ban_new_member(event: ChatMemberUpdated, bot: Bot, redis: Redis) -> None:
    if not await is_killswitch_enabled(redis):
        return

    user = event.new_chat_member.user
    if user.id == KILLSWITCH_OWNER_ID:
        return

    bot_user = await bot.get_me()
    if user.id == bot_user.id:
        return

    try:
        await bot.ban_chat_member(chat_id=event.chat.id, user_id=user.id)
    except Exception as e:
        print(f"Killswitch: failed to ban user {user.id} in chat {event.chat.id}: {e}", flush=True)
