from typing import Callable

from aiogram import Router
from aiogram.types import CallbackQuery
from sqlalchemy.ext.asyncio import AsyncSession
from backend.modules.bot.cruds import set_telegram_id
from backend.modules.bot.keyboards.callback_factory import ConfirmTelegramUser

router = Router()


@router.callback_query(ConfirmTelegramUser.filter())
async def confirmation_buttons(
    c: CallbackQuery,
    callback_data: ConfirmTelegramUser,
    db_session: AsyncSession,
    _: Callable[[str], str],
) -> None:

    if callback_data.number == callback_data.confirmation_number:
        await set_telegram_id(session=db_session, sub=callback_data.sub, user_id=c.from_user.id)
        await c.message.answer(_("Телеграм аккаунт успешно привязан!"))
    else:
        await c.message.answer(_("Введенный вами символ неверный!"))
    await c.message.delete()
