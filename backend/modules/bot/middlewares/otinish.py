"""Inject OtinishService into bot handlers."""

from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject

from backend.modules.sgotinish.service import OtinishService


class OtinishMiddleware(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        db_session = data.get("db_session")
        if db_session is not None:
            data["otinish_service"] = OtinishService(db_session)
        return await handler(event, data)
