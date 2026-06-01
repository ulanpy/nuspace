from typing import Any, Awaitable, Callable

import httpx
from aiogram import BaseMiddleware
from aiogram.types import TelegramObject


class MeilisearchMiddleware(BaseMiddleware):
    def __init__(self, meilisearch_client: httpx.AsyncClient) -> None:
        self.meilisearch_client = meilisearch_client

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        data["meilisearch_client"] = self.meilisearch_client
        return await handler(event, data)
