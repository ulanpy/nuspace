from aiogram.fsm.storage.memory import MemoryStorage
import requests
from aiogram import Dispatcher, Bot
from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession, AsyncEngine


from backend.routes.bot.config import config
from backend.routes.bot.routes.user import router as user_router
from backend.routes.bot.routes.group import router as group_router
from backend.routes.bot.routes.user_callback import router as user_callback_router
from backend.common.dependencies import get_db_session

def decide_webhook_url(dev_url: str = config.ngrok_server_endpoint, prod_url: str = config.url_webhook_endpoint, IS_DEBUG: bool = True) -> str:
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
        url_webhook = f"{public_url}/api"
    else:
        url_webhook = prod_url
    return url_webhook


async def initialize_bot(app, token: str = config.TG_API_KEY, dev_url: str = config.ngrok_server_endpoint,
                         prod_url: str = config.url_webhook_endpoint, db_session: AsyncSession = Depends(get_db_session)):
    app.state.bot = Bot(token=token)
    app.state.dp = Dispatcher(storage=MemoryStorage())

    # Store URL in dispatcher's data
    url = decide_webhook_url(dev_url=dev_url, prod_url=prod_url)


    app.state.dp.include_router(user_router)
    app.state.dp.include_router(group_router)

    app.state.dp.include_router(user_callback_router)
    print(f"webhook {url}", flush=True)
    await app.state.bot.set_webhook(url=f"{url}/webhook",
                                    drop_pending_updates=True,
                                    allowed_updates=app.state.dp.resolve_used_update_types())
    scheduler = app.state.scheduler
    scheduler.start()
    app.state.dp["scheduler_session"] = app.state.scheduler
    app.state.dp["db_session"] = db_session