from aiogram import Router
from aiogram.types import Message
from aiogram.filters import CommandStart

router = Router(name="user")

@router.message(CommandStart())
async def user_start(m: Message):
    await m.answer("Hello World!")