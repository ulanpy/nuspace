"""Inject gettext ``_`` into handler context (default locale: en)."""

import gettext
import os
from pathlib import Path
from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware
from aiogram.types import CallbackQuery, Message, TelegramObject
from redis.asyncio import Redis

DEFAULT_LANGUAGE = "en"


def get_translator(lang: str) -> Callable[[str], str]:
    """Load compiled ``messages.mo`` for the given locale code."""
    locales_dir = os.path.join(Path(__file__).parent.parent, "locales")
    translator = gettext.translation("messages", localedir=locales_dir, languages=[lang])
    return translator.gettext


class I18N(BaseMiddleware):
    """Attach ``data['_']`` for handlers that wrap user-visible strings."""

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        user_id = None
        if isinstance(event, (Message, CallbackQuery)):
            user_id = event.from_user.id

        if not user_id:
            return await handler(event, data)

        redis: Redis = data.get("redis")
        language: str = await redis.get(f"language:{user_id}") or DEFAULT_LANGUAGE
        data["_"] = get_translator(language)
        return await handler(event, data)
