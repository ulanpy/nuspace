from aiogram import Router

from backend.modules.bot.routes.course.grades import router as grades_router


def setup_course_routers() -> Router:
    router = Router(name="Course router")
    router.include_router(grades_router)
    return router
