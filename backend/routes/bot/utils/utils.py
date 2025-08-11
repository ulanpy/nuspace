from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.redis import RedisStorage
from aiogram.types.bot_command import BotCommand
from aiogram.types.bot_command_scope_all_private_chats import BotCommandScopeAllPrivateChats
from fastapi import FastAPI

from backend.core.configs.config import config
from backend.routes.bot.middlewares import setup_middlewares
from backend.routes.bot.routes import include_routers


async def initialize_bot(
    app: FastAPI,
    token: str = config.TELEGRAM_BOT_TOKEN,
):
    app.state.bot = Bot(token=token)
    app.state.dp = Dispatcher(storage=RedisStorage(app.state.redis))

    setup_middlewares(
        dp=app.state.dp,
        url=config.HOME_URL,
        redis=app.state.redis,
        db_manager=app.state.db_manager,
        storage_client=app.state.storage_client,
    )

    # Routers
    include_routers(app.state.dp)

    # await set_commands(app.state.bot)
    print(f"webhook {config.HOME_URL}", flush=True)
    await app.state.bot.set_webhook(
        url=f"{config.HOME_URL}/api/webhook",
        drop_pending_updates=True,
        allowed_updates=app.state.dp.resolve_used_update_types(),
        secret_token=config.TG_WEBHOOK_SECRET_TOKEN,
    )

    start = BotCommand(command="start", description="start")
    language = BotCommand(command="language", description="language")
    notification = BotCommand(command="notification", description="notification")
    await app.state.bot.set_my_commands(
        commands=[start, language, notification], scope=BotCommandScopeAllPrivateChats()
    )
