import os
import gettext
from pathlib import Path

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, Message, CallbackQuery
from typing import Callable, Awaitable, Any

from redis.asyncio import Redis


def get_translator(lang: str):
    LOCALES_DIR = os.path.join(Path(__file__).parent.parent, "locales")
    translator = gettext.translation("messages", localedir=LOCALES_DIR, languages=[lang])
    return translator.gettext


class I18N(BaseMiddleware):

    async def __call__(
            self,
            handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
            event: TelegramObject,
            data: dict[str, Any]) -> Any:
        user_id = None

        if isinstance(event, Message):
            user_id = event.from_user.id
        elif isinstance(event, CallbackQuery):
            user_id = event.from_user.id

        if not user_id:
            return await handler(event, data)

        user_id = event.from_user.id
        key = f"language:{user_id}"
        redis: Redis = data.get("redis")
        language: str = await redis.get(key) or "en"
        _ = get_translator(language)
        data['_'] = _
        return await handler(event, data)
