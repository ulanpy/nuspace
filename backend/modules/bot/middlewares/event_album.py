"""Cache Telegram album items before command handlers run."""

from __future__ import annotations

from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware
from aiogram.types import Message, TelegramObject
from redis.asyncio import Redis

from backend.modules.bot.utils.telegram_event_album import cache_event_album_message


class EventAlbumMiddleware(BaseMiddleware):
    def __init__(self, redis: Redis) -> None:
        self.redis = redis

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        if isinstance(event, Message) and event.media_group_id:
            await cache_event_album_message(self.redis, event)
        return await handler(event, data)
