from aiogram.fsm.storage.memory import MemoryStorage
import requests
from aiogram import Dispatcher, Bot

from fastapi import FastAPI

from backend.routes.bot.middlewares import setup_middlewares
from backend.routes.bot.config import config
from backend.routes.bot.routes import include_routers


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
    setup_middlewares(app.state.dp)

    #Routers
    include_routers(app.state.dp)

    print(f"webhook {url}", flush=True)
    await app.state.bot.set_webhook(url=f"{url}/webhook",
                                    drop_pending_updates=True,
                                    allowed_updates=app.state.dp.resolve_used_update_types())



