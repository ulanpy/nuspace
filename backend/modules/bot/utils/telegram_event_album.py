"""Short-lived Telegram album cache used by the /post command."""

from __future__ import annotations

import logging

from aiogram import Bot
from aiogram.types import Message
from redis.asyncio import Redis

logger = logging.getLogger(__name__)

EVENT_ALBUM_TTL_SECONDS = 24 * 60 * 60


def event_album_key(chat_id: int, media_group_id: str) -> str:
    return f"bot:event-album:{chat_id}:{media_group_id}"


async def cache_event_album_message(redis: Redis, message: Message) -> None:
    """Cache one album item so a later reply can use captions on any item."""
    if not message.media_group_id:
        return

    key = event_album_key(message.chat.id, message.media_group_id)
    await redis.hset(key, str(message.message_id), message.model_dump_json())
    await redis.expire(key, EVENT_ALBUM_TTL_SECONDS)


async def load_event_album_messages(
    redis: Redis,
    *,
    source_message: Message,
    bot: Bot,
) -> list[Message]:
    """Load a replied album in Telegram order, falling back to the replied item."""
    if not source_message.media_group_id:
        return [source_message]

    key = event_album_key(source_message.chat.id, source_message.media_group_id)
    stored_messages = await redis.hgetall(key)
    messages: list[Message] = []
    for payload in stored_messages.values():
        if isinstance(payload, bytes):
            payload = payload.decode("utf-8")
        try:
            messages.append(Message.model_validate_json(payload, context={"bot": bot}))
        except (TypeError, ValueError):
            logger.warning("Skipping an invalid cached Telegram album item for key=%s", key)

    if all(message.message_id != source_message.message_id for message in messages):
        messages.append(source_message)
    return sorted(messages, key=lambda message: message.message_id)
