import asyncio
from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.redis import RedisStorage
from aiogram.types.bot_command import BotCommand
from aiogram.types.bot_command_scope_all_private_chats import BotCommandScopeAllPrivateChats
from aiogram.types.menu_button_web_app import MenuButtonWebApp

from aiogram.types.web_app_info import WebAppInfo
from fastapi import FastAPI

from backend.core.configs.config import config
from backend.routes.bot.middlewares import setup_middlewares
from backend.routes.bot.routes import include_routers


async def setup_bot(
    app: FastAPI,
    token: str = config.TELEGRAM_BOT_TOKEN,
):
    app.state.bot = Bot(token=token)
    app.state.dp = Dispatcher(storage=RedisStorage(app.state.redis))

    # Discover bot username dynamically (without @) to avoid hardcoding
    try:
        me = await app.state.bot.get_me()
        username = getattr(me, "username", None)
        if isinstance(username, str) and len(username) > 0:
            app.state.bot_username = username.lstrip("@")
        else:
            app.state.bot_username = None
    except Exception as e:
        print(f"Failed to fetch bot username: {e}", flush=True)
        app.state.bot_username = None

    setup_middlewares(
        dp=app.state.dp,
        url=config.HOME_URL,
        redis=app.state.redis,
        db_manager=app.state.db_manager,
        storage_client=app.state.storage_client,
    )


    # Routers
    include_routers(app.state.dp)

    # Set Telegram Mini App URL in the chat menu button and configure commands
    try:
        web_app_info = WebAppInfo(url=config.HOME_URL)
        await app.state.bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(text="Home", web_app=web_app_info)
        )
    except Exception as e:
        print(f"Failed to set menu button: {e}", flush=True)

    try:
        start = BotCommand(command="start", description="start")
        language = BotCommand(command="language", description="language")
        notification = BotCommand(command="notification", description="notification")
        await app.state.bot.set_my_commands(
            commands=[start, language, notification], scope=BotCommandScopeAllPrivateChats()
        )
    except Exception as e:
        print(f"Failed to set bot commands: {e}", flush=True)

    # set webhook   
    try:
        print(f"Setting webhook to {config.HOME_URL}/api/webhook", flush=True)
        await app.state.bot.set_webhook(
            url=f"{config.HOME_URL}/api/webhook",
            drop_pending_updates=True,
            allowed_updates=app.state.dp.resolve_used_update_types(),
            secret_token=config.TG_WEBHOOK_SECRET_TOKEN,
        )
        print("Webhook set successfully", flush=True)
        return
    except Exception as e:
        print(f"Failed to set webhook {config.HOME_URL}/api/webhook: {e}", flush=True)



async def cleanup_bot(app: FastAPI):
    bot = getattr(app.state, "bot", None)
    if bot:
        try:
            await bot.delete_webhook(drop_pending_updates=True)
        except Exception:
            pass
