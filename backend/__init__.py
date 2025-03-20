from contextlib import asynccontextmanager
from fastapi import FastAPI

from aiogram import Dispatcher, Bot
from aiogram.fsm.storage.memory import MemoryStorage

from backend.routes.bot.config import TG_API_KEY, WEBHOOK_URL
from backend.routes.bot.routes.user import router as user_router
from backend.routes.bot.routes.user_callback import router as user_callback_router
from backend.routes.bot.routes.webhook import web_router
from backend.routes.bot.routes.group import router as group_router
from backend.routes import get_admin, auth, clubs
from backend.core.database.manager import AsyncDatabaseManager
from backend.core.configs.config import session_middleware_key
from backend.routes.auth.auth import KeyCloakManager

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        app.state.db_manager = AsyncDatabaseManager()
        app.state.kc_manager = KeyCloakManager()
        await app.state.db_manager.create_all_tables()

        app.state.bot = Bot(token=TG_API_KEY)
        app.state.dp = Dispatcher(storage=MemoryStorage())
        app.state.dp.include_router(user_router)
        app.state.dp.include_router(group_router)
        app.state.dp.include_router(user_callback_router)

        await app.state.bot.set_webhook(url=WEBHOOK_URL,
                                        drop_pending_updates=True,
                                        allowed_updates=app.state.dp.resolve_used_update_types())



        print("Application startup: AsyncDatabaseManager initialized")
        routers = [auth.router, clubs.router, web_router]
        for router in routers:
            app.include_router(router)
        await get_admin(app)
        yield
    finally:
        await app.state.db_manager.async_engine.dispose()
        await app.state.bot.delete_webhook()
        print("Application shutdown: Database engine disposed")


origins = [
    "http://localhost:3000",
    "https://lh3.googleusercontent.com"
]