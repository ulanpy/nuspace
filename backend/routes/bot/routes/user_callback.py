from aiogram import Router
from aiogram.types import CallbackQuery

from backend.routes.bot.keyboards.callback_factory import ConfirmTelegramUser

router = Router()

@router.callback_query(ConfirmTelegramUser.filter())
async def confirmation_buttons(c: CallbackQuery,
                               callback_data: ConfirmTelegramUser):
    await c.message.delete()
    if callback_data.number == callback_data.confirmation_number:
        await c.message.answer("Correct")
    else:
        await c.message.answer("Incorrect")