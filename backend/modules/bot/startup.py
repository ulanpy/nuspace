"""Bot lifecycle: webhook, dispatcher, middlewares, and Telegram commands."""

from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.redis import RedisStorage
from aiogram.types.bot_command import BotCommand
from aiogram.types.bot_command_scope_all_group_chats import BotCommandScopeAllGroupChats
from aiogram.types.bot_command_scope_all_private_chats import BotCommandScopeAllPrivateChats
from aiogram.types.bot_command_scope_chat import BotCommandScopeChat
from fastapi import FastAPI

from backend.core.configs.config import config
from backend.modules.bot.consts import DEV_CHAT_ID
from backend.modules.bot.middlewares import setup_middlewares
from backend.modules.bot.routes import include_routers


async def setup_bot(
    app: FastAPI,
    token: str = config.TELEGRAM_BOT_TOKEN,
) -> None:
    """Create Bot/Dispatcher, wire middlewares, register webhook."""
    app.state.bot = Bot(token=token)
    app.state.dp = Dispatcher(storage=RedisStorage(app.state.redis))
    try:
        me = await app.state.bot.get_me()
        username = getattr(me, "username", None)
        app.state.bot_username = username.lstrip("@") if username else None
    except Exception as e:
        print(f"Failed to fetch bot username: {e}", flush=True)
        app.state.bot_username = None

    setup_middlewares(
        dp=app.state.dp,
        url=config.PUBLIC_WEBHOOK_URL,
        redis=app.state.redis,
        db_manager=app.state.db_manager,
        storage_client=app.state.storage_client,
        meilisearch_client=app.state.meilisearch_client,
        broker=app.state.broker,
        signing_credentials=getattr(app.state, "signing_credentials", None),
        app_config=getattr(app.state, "config", config),
    )

    include_routers(app.state.dp)

    try:
        await app.state.bot.set_my_commands(
            commands=[
                BotCommand(command="start", description="start"),
                BotCommand(command="course", description="Course grade statistics"),
                BotCommand(command="post", description="Publish replied post as campus event"),
            ],
            scope=BotCommandScopeAllPrivateChats(),
        )
        await app.state.bot.set_my_commands(
            commands=[BotCommand(command="course", description="Course grade statistics")],
            scope=BotCommandScopeAllGroupChats(),
        )
        await app.state.bot.set_my_commands(
            commands=[
                BotCommand(command="killswitch", description="Anti-spam: ban new members"),
            ],
            scope=BotCommandScopeChat(chat_id=DEV_CHAT_ID),
        )
    except Exception as e:
        print(f"Failed to set bot commands: {e}", flush=True)

    try:
        print(f"Setting webhook to {config.PUBLIC_WEBHOOK_URL}/api/webhook", flush=True)
        await app.state.bot.set_webhook(
            url=f"{config.PUBLIC_WEBHOOK_URL}/api/webhook",
            drop_pending_updates=True,
            allowed_updates=app.state.dp.resolve_used_update_types(),
            secret_token=config.TG_WEBHOOK_SECRET_TOKEN,
        )
        print("Webhook set successfully", flush=True)
    except Exception as e:
        print(f"Failed to set webhook {config.PUBLIC_WEBHOOK_URL}/api/webhook: {e}", flush=True)


async def cleanup_bot(app: FastAPI) -> None:
    bot = getattr(app.state, "bot", None)
    if bot:
        try:
            await bot.delete_webhook(drop_pending_updates=True)
        except Exception:
            pass
