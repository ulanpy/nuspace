from aiogram import Dispatcher

from .user import group_router, private_message_router, private_callback_router


def include_routers(dp: Dispatcher) -> None:
    dp.include_router(group_router)
    dp.include_router(private_callback_router)
    dp.include_router(private_message_router)
