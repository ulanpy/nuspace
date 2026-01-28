from typing import Callable

from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message
from redis.asyncio import Redis

from backend.modules.bot.keyboards.kb import kb_languages, kb_url

router = Router()


@router.message(CommandStart(deep_link=False))
async def user_start(m: Message, public_url: str, _: Callable[[str], str], redis: Redis):
    await m.answer(
        _("Добро пожаловать в nuspace, перейди по ссылке ниже!"),
        reply_markup=kb_url(url=public_url),
    )
