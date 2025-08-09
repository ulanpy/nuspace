from aiogram import Dispatcher

from .user import setup_group_routers, setup_private_routers


def include_routers(dp: Dispatcher) -> None:
    private_router = setup_private_routers()
    group_router = setup_group_routers()
    dp.include_router(private_router)
    dp.include_router(group_router)
