import contextlib
from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject

from backend.core.database.manager import AsyncDatabaseManager


class DatabaseMiddleware(BaseMiddleware):
    def __init__(self, db_manager: AsyncDatabaseManager) -> None:
        self.db_manager = db_manager

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:

        async with contextlib.asynccontextmanager(self.db_manager.get_async_session)() as session:
            data["db_session"] = session
            return await handler(event, data)
