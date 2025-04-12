import requests
from aiogram.fsm.storage.redis import RedisStorage
from aiogram import Dispatcher, Bot
from aiogram.webhook.aiohttp_server import setup_application
from fastapi import FastAPI

from backend.routes.bot.middlewares import setup_middlewares
from backend.core.configs.config import config
from backend.routes.bot.routes import include_routers
from backend.routes.bot.bot import webhook
from backend.routes.bot.hints_command import set_commands
from backend.routes.google_bucket.utils import update_push_endpoint


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

            update_push_endpoint(f"{public_url}/bucket/gcs-hook")
        except Exception as e:
            public_url = None
            print(f"Error fetching Ngrok URL: {e}")
    if public_url is not None:
        url_webhook = f"{public_url}/api"
    else:
        url_webhook = prod_url
        update_push_endpoint(f"{public_url}/bucket/gcs-hook")
    return url_webhook


async def initialize_bot(app: FastAPI, token: str = config.TG_API_KEY, dev_url: str = config.ngrok_server_endpoint,
                         prod_url: str = config.url_webhook_endpoint, IS_DEBUG: bool = True):
    app.state.bot = Bot(token=token)
    app.state.dp = Dispatcher(storage=RedisStorage(app.state.redis))

    # Store URL in dispatcher's data
    url = decide_webhook_url(dev_url=dev_url, prod_url=prod_url, IS_DEBUG=IS_DEBUG)
    public_url = url.replace("/api", "")

    #Middlewares
    setup_middlewares(
        dp=app.state.dp,
        url=public_url,
        redis=app.state.redis,
        db_manager=app.state.db_manager,
        storage_client=app.state.storage_client
    )

    #Routers
    include_routers(app.state.dp)

   # await set_commands(app.state.bot)
    print(f"webhook {url}", flush=True)
    await app.state.bot.set_webhook(url=f"{url}/webhook",
                                    drop_pending_updates=True,
                                    allowed_updates=app.state.dp.resolve_used_update_types(),
                                    secret_token=config.SECRET_TOKEN)



