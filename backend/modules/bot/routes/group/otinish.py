"""Ministry inbox chats: status notices only (claimed / closed).

Closing is private: student (unclaimed) or claimer via /close in DM.
"""

from aiogram import F, Router
from aiogram.enums.chat_type import ChatType
from aiogram.filters import BaseFilter
from aiogram.types import TelegramObject

from backend.modules.sgotinish.service import OtinishService

router = Router(name="Otinish ministry inbox router")


class SgotinishMinistryChatFilter(BaseFilter):
    async def __call__(
        self,
        event: TelegramObject,
        otinish_service: OtinishService | None = None,
    ) -> bool:
        chat = getattr(event, "chat", None)
        if chat is None:
            message = getattr(event, "message", None)
            chat = getattr(message, "chat", None)
        if chat is None or otinish_service is None:
            return False
        return await otinish_service.is_ministry_inbox_chat(chat.id)


router.message.filter(F.chat.type.in_({ChatType.GROUP, ChatType.SUPERGROUP}))
router.message.filter(SgotinishMinistryChatFilter())
