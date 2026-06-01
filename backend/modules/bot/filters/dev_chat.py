from aiogram.filters import BaseFilter
from aiogram.types import TelegramObject

from backend.modules.bot.consts import DEV_CHAT_ID


class DevChatFilter(BaseFilter):
    async def __call__(self, event: TelegramObject) -> bool:
        chat = getattr(event, "chat", None)
        return chat is not None and chat.id == DEV_CHAT_ID
