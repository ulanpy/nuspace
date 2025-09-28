from typing import Callable

from aiogram import Router
from aiogram.types import CallbackQuery
from redis.asyncio import Redis

from backend.modules.bot.keyboards.callback_factory import Languages

router = Router()


@router.callback_query(Languages.filter())
async def choose_language(
    c: CallbackQuery, callback_data: Languages, redis: Redis, _: Callable[[str], str]
) -> None:
    key = f"language:{c.from_user.id}"
    await redis.set(key, callback_data.language)
    await c.message.answer(_("Язык успешно изменен!"))
    await c.message.delete()
