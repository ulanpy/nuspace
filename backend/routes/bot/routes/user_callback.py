from aiogram import Router
from aiogram.types import CallbackQuery
from sqlalchemy.ext.asyncio import AsyncSession

from backend.routes.bot.keyboards.callback_factory import ConfirmTelegramUser
from backend.routes.bot.cruds import set_telegram_id, get_telegram_id

router = Router(name="Private callback router")


@router.callback_query(ConfirmTelegramUser.filter())
async def confirmation_buttons(c: CallbackQuery,
                               callback_data: ConfirmTelegramUser,
                               db_session: AsyncSession) -> None:
    """
        Handles the callback query for Telegram user confirmation.
        Checks if the user is already authorized by their sub (unique identifier).
        If the confirmation number matches, updates the user's Telegram ID in the database.
        If the confirmation number is incorrect, notifies the user.
        Deletes the confirmation message after processing.
    """
    user_id = c.from_user.id
    if await get_telegram_id(session=db_session, sub=callback_data.sub) is not None:
        await c.message.answer("Уже авторизирован!")
        return

    if callback_data.number == callback_data.confirmation_number:
        await c.message.answer(f"Correct: {await set_telegram_id(session=db_session,
                                                                 sub=callback_data.sub,
                                                                 user_id=user_id)}")
    else:
        await c.message.answer("Incorrect")
    await c.message.delete()