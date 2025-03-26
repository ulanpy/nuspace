from fastapi import APIRouter, Request
from aiogram.types import Update


web_router = APIRouter()


@web_router.post("/webhook")
async def webhook(request:  Request) -> None:
    """
        Handles incoming webhook requests from Telegram.
        Extracts the bot and dispatcher (dp) from the app state.
        Attaches the database and scheduler session to the dispatcher for use in handlers.
        Validates the incoming update from Telegram and processes it using the dispatcher.
    """
    bot = request.app.state.bot
    dp = request.app.state.dp
    update = Update.model_validate(await request.json(), context={"bot": bot})
    await dp.feed_update(bot, update)