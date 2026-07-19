from __future__ import annotations

from datetime import datetime, timezone

from aiogram.types import Message

from backend.modules.bot.schemas.event_post import TelegramEventPostInput


def _entity_urls(message: Message) -> list[str]:
    text = message.text or message.caption or ""
    entities = list(message.entities or []) + list(message.caption_entities or [])
    urls: list[str] = []
    for entity in entities:
        if entity.type == "text_link" and entity.url:
            urls.append(entity.url)
        elif entity.type == "url" and text:
            urls.append(text[entity.offset : entity.offset + entity.length])
    # Preserve order, drop duplicates
    seen: set[str] = set()
    unique: list[str] = []
    for url in urls:
        if url not in seen:
            seen.add(url)
            unique.append(url)
    return unique


def _largest_photo_unique_id(message: Message) -> str | None:
    if not message.photo:
        return None
    return message.photo[-1].file_unique_id


def _origin_fields(message: Message) -> dict:
    origin = message.forward_origin
    if origin is None:
        return {
            "origin_type": None,
            "origin_chat_id": None,
            "origin_message_id": None,
            "forward_date": (
                datetime.fromtimestamp(message.forward_date, tz=timezone.utc).replace(tzinfo=None)
                if message.forward_date
                else None
            ),
            "forward_sender_name": message.forward_sender_name,
        }

    origin_type = getattr(origin, "type", None)
    origin_type_value = origin_type.value if hasattr(origin_type, "value") else str(origin_type)
    forward_date = getattr(origin, "date", None)
    if isinstance(forward_date, datetime) and forward_date.tzinfo is not None:
        forward_date = forward_date.astimezone(timezone.utc).replace(tzinfo=None)

    origin_chat_id = None
    origin_message_id = None
    forward_sender_name = message.forward_sender_name

    # MessageOriginMessage / MessageOriginChannel
    chat = getattr(origin, "chat", None)
    if chat is not None:
        origin_chat_id = chat.id
    origin_message_id = getattr(origin, "message_id", None)

    # MessageOriginHiddenUser
    if getattr(origin, "sender_user_name", None):
        forward_sender_name = origin.sender_user_name

    # MessageOriginUser
    sender_user = getattr(origin, "sender_user", None)
    if sender_user is not None and not forward_sender_name:
        forward_sender_name = sender_user.full_name or sender_user.username

    return {
        "origin_type": origin_type_value,
        "origin_chat_id": origin_chat_id,
        "origin_message_id": origin_message_id,
        "forward_date": forward_date,
        "forward_sender_name": forward_sender_name,
    }


def build_telegram_event_post_input(
    *,
    command_message: Message,
    source_message: Message,
) -> TelegramEventPostInput:
    """
    Build ingestion payload from the forwarded/source message the user replied to.

    `command_message` is the /post reply; `source_message` is reply_to_message.
    """
    if command_message.from_user is None:
        raise ValueError("Missing Telegram user on /post command")

    raw_payload: dict | None
    try:
        raw_payload = source_message.model_dump(mode="json")
    except Exception:
        raw_payload = None

    origin = _origin_fields(source_message)
    caption = source_message.caption or source_message.text

    return TelegramEventPostInput(
        submitter_telegram_id=command_message.from_user.id,
        bot_chat_id=command_message.chat.id,
        bot_message_id=source_message.message_id,
        caption=caption,
        link_urls=_entity_urls(source_message),
        media_file_unique_id=_largest_photo_unique_id(source_message),
        raw_payload=raw_payload,
        **origin,
    )
