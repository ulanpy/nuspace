from contextlib import asynccontextmanager
from fastapi import FastAPI
from aiogram import Dispatcher, Bot
from aiogram.fsm.storage.memory import MemoryStorage
import requests


from backend.routes.bot.config import TG_API_KEY, ngrok_server_endpoint, url_webhook_endpoint
from backend.routes.bot.routes.user import router as user_router
from backend.routes.bot.routes.user_callback import router as user_callback_router
from backend.routes.bot.routes.webhook import web_router
from backend.routes import get_admin, auth, clubs
from backend.core.database.manager import AsyncDatabaseManager
from backend.core.configs.config import session_middleware_key
from backend.routes.auth.auth import KeyCloakManager

def decide_webhook_url(dev_url: ngrok_server_endpoint, prod_url: url_webhook_endpoint, IS_DEBUG: bool = True) -> str:
    public_url = None
    if IS_DEBUG:
        try:
            response = requests.get(dev_url)
            response.raise_for_status()
            tunnels = response.json()["tunnels"]
            public_url = tunnels[0]["public_url"]
            print(f"Ngrok public URL: {public_url}")
        except Exception as e:
            public_url = None
            print(f"Error fetching Ngrok URL: {e}")
    if public_url is not None:
        url_webhook = f"{public_url}/api/webhook"
    else:
        url_webhook = prod_url
    return url_webhook


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        app.state.db_manager = AsyncDatabaseManager()
        app.state.kc_manager = KeyCloakManager()
        await app.state.db_manager.create_all_tables()

        app.state.bot = Bot(token=TG_API_KEY)
        app.state.dp = Dispatcher(storage=MemoryStorage())
        app.state.dp.include_router(user_router)
        app.state.dp.include_router(user_callback_router)
        url_webhook = decide_webhook_url(dev_url=ngrok_server_endpoint, prod_url=url_webhook_endpoint)
        await app.state.bot.set_webhook(url=url_webhook,
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