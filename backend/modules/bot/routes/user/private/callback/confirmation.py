from typing import Callable

from aiogram import Router
from aiogram.types import CallbackQuery

from backend.modules.bot.keyboards.callback_factory import ConfirmTelegramUser
from backend.modules.bot.services.link import TelegramLinkService

router = Router()


@router.callback_query(ConfirmTelegramUser.filter())
async def confirmation_buttons(
    c: CallbackQuery,
    callback_data: ConfirmTelegramUser,
    telegram_link_service: TelegramLinkService,
    _: Callable[[str], str],
) -> None:
    """Complete website-initiated Telegram linking after emoji confirmation."""
    linked = await telegram_link_service.confirm_link(
        callback_data.sub,
        c.from_user.id,
        picked_number=callback_data.number,
        expected_number=callback_data.confirmation_number,
    )
    if linked:
        await c.message.answer(_("Телеграм аккаунт успешно привязан!"))
    else:
        await c.message.answer(_("Введенный вами символ неверный!"))
    await c.message.delete()
