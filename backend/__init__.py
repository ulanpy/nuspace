from contextlib import asynccontextmanager
from fastapi import FastAPI
from redis import asyncio as aioredis
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from backend.routes.bot.routes.bot import web_router
from backend.routes.bot.utils import initialize_bot
from backend.routes import routers, get_admin
from backend.core.database.manager import AsyncDatabaseManager, SyncDatabaseManager
from backend.core.configs.config import config
from backend.routes.auth.auth import KeyCloakManager

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        app.state.db_manager = AsyncDatabaseManager()
        app.state.redis = aioredis.from_url(config.REDIS_URL)
        app.state.db_manager_sync = SyncDatabaseManager()
        app.state.kc_manager = KeyCloakManager()
        app.state.scheduler = AsyncIOScheduler()
        await app.state.db_manager.create_all_tables()
        if config.IS_BOT_DEV:
            await initialize_bot(app)
        for router in routers:
            app.include_router(router)
        get_admin(app)
        yield

    finally:
        await app.state.db_manager.async_engine.dispose()
        if config.IS_BOT_DEV:
            await app.state.bot.delete_webhook()
        print("Application shutdown: Database engine disposed")



origins = [
    "http://localhost:3000",
    "https://lh3.googleusercontent.com"
    "https://kazgptbot.ru"
]