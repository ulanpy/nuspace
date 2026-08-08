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
        uow = data.get("uow")
        if uow is not None:
            data["otinish_service"] = OtinishService(uow)
        return await handler(event, data)
