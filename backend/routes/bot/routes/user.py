from aiogram import Router, F
from aiogram.types import Message
from aiogram.enums import ChatType
from aiogram.filters import CommandStart, CommandObject
from aiogram.utils.deep_linking import decode_payload

from sqlalchemy.ext.asyncio import AsyncSession

from backend.routes.bot.cruds import get_telegram_id, check_existance_by_sub
from backend.routes.bot.keyboards.kb import kb_webapp, kb_confirmation


router = Router(name="Private message router")


@router.message(CommandStart(deep_link=True), F.chat.type == ChatType.PRIVATE)
async def user_start_link(m: Message,
                          command: CommandObject,
                          db_session: AsyncSession):
    """
        Handles the start command with a deep link for private chats.
        Extracts the payload from the deep link, decodes it, and checks if the user's Telegram ID is already linked.
        If not, prompts the user to select the correct emoji for confirmation.
        If already linked, informs the user that their Telegram account is already connected.
    """
    args = command.args
    payload: str = decode_payload(args)
    sub, confirmation_number = payload.split("&")
    if await check_existance_by_sub(session=db_session, sub=sub):
        if await get_telegram_id(session=db_session, sub=sub) is None:
            await m.answer(f"Отлично, теперь выбери верный смайлик!", reply_markup=kb_confirmation(sub=sub, confirmation_number=confirmation_number))
        else:
            await m.answer("Ваш телеграм аккаунт уже привязан!")
    else:
        await m.answer("Not valid sub")

@router.message(CommandStart(deep_link=False), F.chat.type == ChatType.PRIVATE)
async def user_start(m: Message):
    """
        Handles the start command without a deep link for private chats.
        Welcomes the user to NUspace and provides a link to the web application.
    """
    await m.answer(f"Добро пожаловать в NUspace, перейди по ссылке ниже!", reply_markup=kb_webapp())


