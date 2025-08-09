from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject
from google.cloud import storage


class BucketClientMiddleware(BaseMiddleware):
    def __init__(self, storage_client: storage.Client) -> None:
        self.storage_client = storage_client

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        data["storage_client"] = self.storage_client
        return await handler(event, data)
