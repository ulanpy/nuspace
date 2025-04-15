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
from backend.routes.google_bucket.utils import update_bucket_push_endpoint


async def initialize_bot(
        app: FastAPI,
        token: str = config.TG_API_KEY,
):
    app.state.bot = Bot(token=token)
    app.state.dp = Dispatcher(storage=RedisStorage(app.state.redis))
    base_url = f"https://{config.ROUTING_PREFIX}"

    setup_middlewares(
        dp=app.state.dp,
        url=base_url.replace("/api", "") if config.IS_DEBUG else config.NUSPACE,
        redis=app.state.redis,
        db_manager=app.state.db_manager,
        storage_client=app.state.storage_client
    )

    #Routers
    include_routers(app.state.dp)

   # await set_commands(app.state.bot)
    print(f"webhook {base_url}", flush=True)
    await app.state.bot.set_webhook(url=f"{base_url}/api/webhook",
                                    drop_pending_updates=True,
                                    allowed_updates=app.state.dp.resolve_used_update_types(),
                                    secret_token=config.SECRET_TOKEN)



