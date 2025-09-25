from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject
from redis.asyncio import Redis


class RedisMiddleware(BaseMiddleware):
    def __init__(self, redis: Redis) -> None:
        self.redis = redis

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        data["redis"] = self.redis
        return await handler(event, data)
