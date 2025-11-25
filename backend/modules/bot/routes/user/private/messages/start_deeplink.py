from typing import Callable

from aiogram import Router
from aiogram.filters import CommandObject, CommandStart
from aiogram.types import Message
from aiogram.utils.deep_linking import decode_payload
from google.cloud import storage
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.bot.cruds import (
    check_existance_by_sub,
    check_user_by_telegram_id,  
    get_telegram_id,
)
from backend.modules.bot.filters import EncodedDeepLinkFilter
from backend.modules.bot.keyboards.kb import kb_confirmation, user_profile_button
from backend.modules.bot.utils.google_bucket import generate_download_url

router = Router()


@router.message(CommandStart(deep_link=True))
async def user_start_link(
    m: Message,
    command: CommandObject,
    db_session: AsyncSession,
    _: Callable[[str], str],
):
    args = command.args
    payload: str = decode_payload(args)
    sub, confirmation_number = payload.split("&")

    if not await check_existance_by_sub(session=db_session, sub=sub):
        return await m.answer(_("Некорректная ссылка"))

    if not await check_user_by_telegram_id(session=db_session, user_id=m.from_user.id):
        return await m.answer(
            _("Отлично, теперь выбери верный смайлик!"),
            reply_markup=kb_confirmation(sub=sub, confirmation_number=confirmation_number),
        )
    return await m.answer(_("Ваш телеграм аккаунт уже привязан!"))
