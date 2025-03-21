from aiogram import Router, F
from aiogram.types import Message, ContentType
from aiogram.enums.chat_type import ChatType

from backend.routes.bot.keyboards.kb import kb_webapp

router = Router(name="Group router")

@router.message(F.chat.type == ChatType.SUPERGROUP)
async def new_member(m: Message):
    await m.answer("DS")

