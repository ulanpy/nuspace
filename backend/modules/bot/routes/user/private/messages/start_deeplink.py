from typing import Callable

from aiogram import Router
from aiogram.filters import CommandObject, CommandStart
from aiogram.types import Message
from aiogram.utils.deep_linking import decode_payload
from backend.modules.bot.keyboards.kb import kb_confirmation
from backend.modules.bot.services.link import DeeplinkStartResult, TelegramLinkService

router = Router()


@router.message(CommandStart(deep_link=True))
async def user_start_link(
    m: Message,
    command: CommandObject,
    telegram_link_service: TelegramLinkService,
    _: Callable[[str], str],
) -> None:
    """Handle /start with encoded payload from the website linking flow."""
    # Plain otinish create / claim payloads are handled by the otinish router.
    args = (command.args or "").strip()
    if args == "otinish" or args.startswith("otinish_t_"):
        return

    try:
        token = decode_payload(command.args)
    except (ValueError, UnicodeDecodeError, AttributeError):
        await m.answer(_("Некорректная ссылка"))
        return

    result = await telegram_link_service.handle_deeplink_start(token, m.from_user.id)
    if result == DeeplinkStartResult.invalid_sub:
        await m.answer(_("Некорректная ссылка"))
        return
    if result == DeeplinkStartResult.needs_confirmation:
        await m.answer(
            _("Отлично, теперь выбери верный смайлик!"),
            reply_markup=kb_confirmation(token=token),
        )
        return

    await m.answer(_("Ваш телеграм аккаунт уже привязан!"))
