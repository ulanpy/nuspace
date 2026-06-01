from aiogram.filters import BaseFilter
from aiogram.types import TelegramObject

from backend.modules.bot.consts import KILLSWITCH_OWNER_ID


class OwnerFilter(BaseFilter):
    async def __call__(self, event: TelegramObject) -> bool:
        user = getattr(event, "from_user", None)
        return user is not None and user.id == KILLSWITCH_OWNER_ID
