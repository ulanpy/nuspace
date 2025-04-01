from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from redis import asyncio as aioredis

from backend.routes.bot.routes.bot import web_router
from backend.routes.bot.utils import initialize_bot
from backend.routes import get_admin, auth, clubs, product
from backend.core.database.manager import AsyncDatabaseManager, SyncDatabaseManager
from backend.core.configs.config import config
from backend.routes.auth.auth import KeyCloakManager
from backend.core.database.models import Product
from backend.common.utils import import_data_from_database
from backend.common.dependencies import get_db_session

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        app.state.db_manager = AsyncDatabaseManager()
        app.state.redis = aioredis.from_url(config.REDIS_URL)
        app.state.db_manager_sync = SyncDatabaseManager()
        app.state.kc_manager = KeyCloakManager()
        await app.state.db_manager.create_all_tables()
        if config.IS_BOT_DEV:
            await initialize_bot(app)
        print("Application startup:AsyncDatabaseManager initialized")
        routers = [auth.router, clubs.router, web_router, product.router]
        for router in routers:
            app.include_router(router)
        print(app.state.kc_manager.KEYCLOAK_URL)
        get_admin(app)
        #import_data_from_database functions needs to be runned on only one FastAPI app
        #await import_data_from_database(storage_name="products", db_manager=app.state.db_manager, model = Product, columns_for_searching=['id', 'name']) 
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