from aiogram.utils.deep_linking import create_start_link
from aiogram import Router
from aiogram.types import Message
from aiogram.filters import CommandStart, CommandObject
from aiogram.utils.deep_linking import decode_payload

router = Router(name="TG router")

@router.message(CommandStart(deep_link=True))
async def user_start_link(m: Message,
                          command: CommandObject):
    args = command.args
    payload = decode_payload(args)
    link, number = payload.split("&")
    await m.answer(f"{link} ---- {number}")

@router.message(CommandStart(deep_link=False))
async def user_start(m: Message):
    jwt = "e6ed2be3-917c-4b5e-93c0-a63f8f71c817&6"
    link = await create_start_link(m.bot, jwt, encode=True)
    await m.answer(link)