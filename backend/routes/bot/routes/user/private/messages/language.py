from typing import Callable

from aiogram import Router, F
from aiogram.types import Message
from aiogram.filters import Command

from backend.routes.bot.keyboards.kb import kb_languages

router = Router()


@router.message(Command("language"))
async def language(
    m: Message,
    _: Callable[[str], str]
):
    await m.answer(_("Выбери нужный язык!"), reply_markup=kb_languages())
