"""Inject TelegramLinkService into handlers that need account linking."""

from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject
from redis.asyncio import Redis

from backend.modules.bot.services.link import TelegramLinkService


class TelegramLinkMiddleware(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        uow = data.get("uow")
        redis: Redis | None = data.get("redis")
        if uow is not None and redis is not None:
            data["telegram_link_service"] = TelegramLinkService(uow, redis)
        return await handler(event, data)
