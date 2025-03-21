from contextlib import asynccontextmanager
from fastapi import FastAPI


from backend.routes.bot.routes.bot import web_router
from backend.routes.bot.utils import initialize_bot
from backend.routes import get_admin, auth, clubs
from backend.core.database.manager import AsyncDatabaseManager
from backend.core.configs.config import session_middleware_key, IS_BOT_DEV
from backend.routes.auth.auth import KeyCloakManager

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        app.state.db_manager = AsyncDatabaseManager()
        app.state.kc_manager = KeyCloakManager()
        await app.state.db_manager.create_all_tables()
        if IS_BOT_DEV:
            await initialize_bot(app)
        print("Application startup:AsyncDatabaseManager initialized")
        routers = [auth.router, clubs.router, web_router]
        for router in routers:
            app.include_router(router)
        await get_admin(app)
        yield
    finally:
        await app.state.db_manager.async_engine.dispose()
        if IS_BOT_DEV:
            await app.state.bot.delete_webhook()
        print("Application shutdown: Database engine disposed")



origins = [
    "*",
    "https://lh3.googleusercontent.com"
]