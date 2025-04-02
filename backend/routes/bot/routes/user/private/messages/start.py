
from typing import Callable

from aiogram import Router
from aiogram.types import Message
from aiogram.filters import CommandStart
from redis.asyncio import Redis

from backend.routes.bot.keyboards.kb import kb_webapp, kb_languages


router = Router()


@router.message(CommandStart(deep_link=False))
async def user_start(
    m: Message,
    public_url: str,
    _: Callable[[str], str],
    redis: Redis
) -> None:

    await m.answer(_("Добро пожаловать в NUspace, перейди по ссылке ниже!"), reply_markup=kb_webapp(url=public_url))
    if await redis.get(f"language:{m.from_user.id}") is None:
        await m.answer(_("Выбери нужный язык!"), reply_markup=kb_languages())