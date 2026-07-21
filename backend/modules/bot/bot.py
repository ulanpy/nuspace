from aiogram.types import Update
from fastapi import APIRouter, Request, Response, status
from aiogram import Dispatcher, Bot
from backend.core.configs.config import config

web_router = APIRouter(tags=["Bot Routes"])


@web_router.post("/webhook")
async def webhook(request: Request) -> Response:
    """
    Webhook for the bot. Receives updates from Telegram and processes them.
    """
    received_token = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
    if received_token != config.TG_WEBHOOK_SECRET_TOKEN:
        return Response(status_code=status.HTTP_403_FORBIDDEN)

    dp: Dispatcher = request.app.state.dp
    bot: Bot = request.app.state.bot

    update = Update.model_validate(await request.json(), context={"bot": bot})
    await dp.feed_update(bot, update)
    return Response(status_code=status.HTTP_200_OK)