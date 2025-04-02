from typing import Callable

from aiogram import Router
from aiogram.types import Message
from aiogram.filters import CommandStart, CommandObject
from aiogram.utils.deep_linking import decode_payload
from sqlalchemy.ext.asyncio import AsyncSession

from backend.routes.bot.keyboards.kb import kb_confirmation
from backend.routes.bot.cruds import get_telegram_id, check_existance_by_sub

router = Router()


@router.message(CommandStart(deep_link=True))
async def user_start_link(
    m: Message,
    command: CommandObject,
    db_session: AsyncSession,
    _: Callable[[str], str]
) -> Message:

    args = command.args
    payload: str = decode_payload(args)
    sub, confirmation_number = payload.split("&")

    if await check_existance_by_sub(session=db_session, sub=sub):
        if await get_telegram_id(session=db_session, sub=sub) is None:
            return await m.answer(_("Отлично, теперь выбери верный смайлик!"),
                                  reply_markup=kb_confirmation(sub=sub, confirmation_number=confirmation_number))
        return await m.answer(_("Ваш телеграм аккаунт уже привязан!"))
    return await m.answer(_("Некорректная ссылка"))