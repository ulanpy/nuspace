from aiogram import Router, F
from aiogram.types import Message
from aiogram.enums import ChatType
from aiogram.filters import CommandStart, CommandObject
from aiogram.utils.deep_linking import decode_payload

from sqlalchemy.ext.asyncio import AsyncSession

from backend.routes.bot.keyboards.kb import kb_webapp, kb_confirmation


router = Router(name="Private message router")

@router.message(CommandStart(deep_link=True), F.chat.type == ChatType.PRIVATE)
async def user_start_link(m: Message,
                          command: CommandObject):
    args = command.args
    payload: str = decode_payload(args)
    sub, confirmation_number = payload.split("&")
    await m.answer("Отлично, теперь выбери верный смайлик!", reply_markup=kb_confirmation(sub=sub, confirmation_number=confirmation_number))

@router.message(CommandStart(deep_link=False), F.chat.type == ChatType.PRIVATE)
async def user_start(m: Message):
    await m.answer(f"Добро пожаловать в NUspace, перейди по ссылке ниже!", reply_markup=kb_webapp())