from aiogram import Bot, Router
from aiogram.exceptions import TelegramAPIError
from aiogram.filters import Command
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message

from backend.modules.campuscurrent.models.events import EventBotSubmissionStatus
from backend.modules.bot.keyboards.kb import kb_url
from backend.modules.bot.services.event_post import EventPostService
from backend.modules.bot.utils.telegram_event_payload import build_telegram_event_post_input
from backend.modules.bot.utils.telegram_media import download_message_image

router = Router(name="Post event router")


def _event_link(base_url: str, event_id: int) -> str:
    return f"{base_url.rstrip('/')}/events?id={event_id}"


def _https_url_or_none(url: str) -> str | None:
    """Telegram inline button URLs must be https (localhost / http are rejected)."""
    return url if url.startswith("https://") else None


async def _safe_edit(
    status_msg: Message,
    text: str,
    *,
    reply_markup: InlineKeyboardMarkup | None = None,
    parse_mode: str | None = None,
) -> None:
    try:
        await status_msg.edit_text(
            text,
            reply_markup=reply_markup,
            parse_mode=parse_mode,
            disable_web_page_preview=True,
        )
    except TelegramAPIError:
        # Avoid webhook retries after the work already finished / user was notified.
        try:
            await status_msg.answer(text, reply_markup=reply_markup, parse_mode=parse_mode)
        except TelegramAPIError:
            pass


@router.message(Command("post"))
async def post_event_command(
    message: Message,
    event_post_service: EventPostService,
    public_url: str,
    bot: Bot,
) -> None:
    """
    Reply to a forwarded (or any) post with /post to publish it as a campus event.

    Requires a linked Nuspace Telegram account.
    """
    if message.from_user is None:
        return

    source = message.reply_to_message
    if source is None:
        await message.answer(
            "Reply to a forwarded event post with /post.\n"
            "Example: forward an announcement here, then reply to it with /post."
        )
        return

    if not (source.text or source.caption or source.photo or source.document):
        await message.answer("That message has no usable content to turn into an event.")
        return

    status_msg = await message.answer("Parsing post and creating event…")

    try:
        payload = build_telegram_event_post_input(
            command_message=message,
            source_message=source,
        )
        image = await download_message_image(bot, source)
        image_bytes, image_mime_type = image if image else (None, None)
        result = await event_post_service.submit_from_telegram(
            payload,
            image_bytes=image_bytes,
            image_mime_type=image_mime_type,
        )
    except PermissionError as exc:
        await _safe_edit(status_msg, str(exc), reply_markup=kb_url(url=public_url))
        return
    except Exception:
        await _safe_edit(
            status_msg,
            "Something went wrong while creating the event. Try again later.",
        )
        return

    if result.status == EventBotSubmissionStatus.published and result.event_id is not None:
        url = _event_link(public_url, result.event_id)
        safe_url = _https_url_or_none(url)
        keyboard = None
        if safe_url is not None:
            keyboard = InlineKeyboardMarkup(
                inline_keyboard=[[InlineKeyboardButton(text="Open event", url=safe_url)]]
            )
        title = result.draft.name if result.draft and result.draft.name else "Event"
        body = f"✅ Published: <b>{title}</b>"
        if safe_url is not None:
            body = f"{body}\n{safe_url}"
        await _safe_edit(status_msg, body, reply_markup=keyboard, parse_mode="HTML")
        return

    await _safe_edit(status_msg, result.message)
