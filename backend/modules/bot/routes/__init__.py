from aiogram import Dispatcher

from backend.modules.bot.routes.user.private import setup_private_routers

def include_routers(dp: Dispatcher) -> None:
    private_router = setup_private_routers()
    dp.include_router(private_router)
