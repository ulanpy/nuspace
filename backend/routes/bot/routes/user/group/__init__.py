from aiogram import F, Router
from aiogram.enums.chat_type import ChatType

from .join import router as join
from .left import router as left
from .message import router as message


def setup_group_routers():
    # ORDER MATTERS
    router: Router = Router(name="Group router")
    router.chat_member.filter(F.chat.type == ChatType.SUPERGROUP)
    router.message.filter(F.chat.type == ChatType.SUPERGROUP)

    router.include_router(join)
    router.include_router(left)
    router.include_router(message)
    return router
