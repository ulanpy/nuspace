from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject

from backend.core.database.manager import AsyncDatabaseManager
from backend.core.database.uow import UnitOfWork


class DatabaseMiddleware(BaseMiddleware):
    def __init__(self, db_manager: AsyncDatabaseManager) -> None:
        self.db_manager = db_manager

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:

        # Do not acquire a connection for the whole Telegram update. Services open
        # a short transaction only around their database work.
        data["uow"] = UnitOfWork(self.db_manager.get_session_maker())
        return await handler(event, data)
