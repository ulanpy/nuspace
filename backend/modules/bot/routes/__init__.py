"""Register all aiogram routers on the dispatcher."""

from aiogram import Dispatcher

from backend.modules.bot.routes.course import setup_course_routers
from backend.modules.bot.routes.group import setup_group_routers
from backend.modules.bot.routes.group.otinish import router as otinish_dept_router
from backend.modules.bot.routes.user.private import setup_private_routers


def include_routers(dp: Dispatcher) -> None:
    dp.include_router(setup_private_routers())
    dp.include_router(otinish_dept_router)
    dp.include_router(setup_group_routers())
    dp.include_router(setup_course_routers())
