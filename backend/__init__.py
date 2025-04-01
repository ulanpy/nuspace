from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from redis.asyncio import Redis, ConnectionPool
from google.cloud import storage


from backend.routes.bot.bot import web_router
from backend.routes.bot.utils import initialize_bot
from backend.routes import auth, routers, get_admin, product, clubs
from backend.core.database.manager import AsyncDatabaseManager, SyncDatabaseManager
from backend.core.configs.config import config, Config
from backend.routes.auth.auth import KeyCloakManager

from backend.core.database.models import Product
from backend.common.utils import import_data_from_database
from backend.common.dependencies import get_db_session

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        app.state.config = Config()

        app.state.storage_client = storage.Client(credentials=config.bucket_credentials)

        app.state.db_manager = AsyncDatabaseManager()
        app.state.db_manager_sync = SyncDatabaseManager()
        app.state.kc_manager = KeyCloakManager()

        redis_pool = ConnectionPool.from_url(
            config.REDIS_URL,
            max_connections=50,
            socket_connect_timeout=5,
            socket_timeout=10,
            health_check_interval=30,
            retry_on_timeout=True,
            decode_responses=True  # Added for consistency
        )
        app.state.redis = Redis(connection_pool=redis_pool)
        await app.state.db_manager.create_all_tables()

        if config.IS_BOT_DEV:
            await initialize_bot(app)
        print("Application startup:AsyncDatabaseManager initialized")
        routers = [auth.router, clubs.router, web_router, product.router]
        for router in routers:
            app.include_router(router)

        get_admin(app)  # SQLAdmin Admin Panel
        #import_data_from_database functions needs to be runned on only one FastAPI app
        #await import_data_from_database(storage_name="products", db_manager=app.state.db_manager, model = Product, columns_for_searching=['id', 'name']) 
        yield

    finally:
        if config.IS_BOT_DEV:
            await app.state.bot.session.close()
            await app.state.bot.delete_webhook(drop_pending_updates=True)

        await app.state.redis.aclose()

        await app.state.db_manager.async_engine.dispose()
        app.state.db_manager_sync.sync_engine.dispose()

        print("Application shutdown: Resources released")


origins = [
    "*",
    "https://lh3.googleusercontent.com"
    "https://kazgptbot.ru"
]