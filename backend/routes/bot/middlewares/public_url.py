from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject


class UrlMiddleware(BaseMiddleware):
    def __init__(self, url: str) -> None:
        self.url = url

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        data["public_url"] = self.url
        return await handler(event, data)
