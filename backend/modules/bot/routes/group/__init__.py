from aiogram import F, Router
from aiogram.enums.chat_type import ChatType

from backend.modules.bot.filters.dev_chat import DevChatFilter
from backend.modules.bot.routes.group.killswitch import router as killswitch_router


def setup_group_routers() -> Router:
    router = Router(name="Group router")
    router.message.filter(F.chat.type.in_({ChatType.GROUP, ChatType.SUPERGROUP}))
    router.chat_member.filter(F.chat.type.in_({ChatType.GROUP, ChatType.SUPERGROUP}))
    router.message.filter(DevChatFilter())
    router.chat_member.filter(DevChatFilter())
    router.include_router(killswitch_router)
    return router
