from aiogram.fsm.storage.memory import MemoryStorage
import requests
from aiogram import Dispatcher, Bot
from aiogram.enums import UpdateType

from fastapi import FastAPI

from backend.routes.bot.middlewares import DatabaseMiddleware, RedisMiddleware, UrlMiddleware
from backend.routes.bot.config import config
from backend.routes.bot.routes.user.private.user import router as user_router
from backend.routes.bot.routes.user.group.group import router as group_router
from backend.routes.bot.routes.user.private.user_callback import router as user_callback_router


def decide_webhook_url(dev_url: str = config.ngrok_server_endpoint,
                       prod_url: str = config.url_webhook_endpoint,
                       IS_DEBUG: bool = True) -> str:
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


async def initialize_bot(app: FastAPI, token: str = config.TG_API_KEY, dev_url: str = config.ngrok_server_endpoint,
                         prod_url: str = config.url_webhook_endpoint):


    app.state.bot = Bot(token=token)
    app.state.dp = Dispatcher(storage=MemoryStorage())

    # Store URL in dispatcher's data
    url = decide_webhook_url(dev_url=dev_url, prod_url=prod_url)
    public_url = url.replace("/api", "")

    #Middlewares
    middlewares = [
        DatabaseMiddleware(app.state.db_manager),
        RedisMiddleware(app.state.redis),
        UrlMiddleware(public_url)
    ]

    for middleware in middlewares:
        app.state.dp.update.middleware(middleware)
        app.state.dp.message.middleware(middleware)
        app.state.dp.callback_query.middleware(middleware)
        app.state.dp.chat_member.middleware(middleware)

    #Routers
    app.state.dp.include_router(user_router)
    app.state.dp.include_router(group_router)
    app.state.dp.include_router(user_callback_router)

    used_updates = [
        UpdateType.MESSAGE,
        UpdateType.CALLBACK_QUERY,
        UpdateType.CHAT_MEMBER,  # Добавлено
        UpdateType.MY_CHAT_MEMBER  # Добавлено
    ]
    print(f"webhook {url}", flush=True)
    await app.state.bot.set_webhook(url=f"{url}/webhook",
                                    drop_pending_updates=True,
                                    allowed_updates=used_updates)



