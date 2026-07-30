from typing import Annotated

from aiogram import Bot, Dispatcher
from aiogram.types import Update
from fastapi import APIRouter, Depends, Request, Response, status

from backend.core.configs.config import config
from backend.modules.auth.dependencies import mark_access_actor

web_router = APIRouter(tags=["Bot Routes"])
_mark_telegram = mark_access_actor("telegram")


@web_router.post("/webhook")
async def webhook(
    request: Request,
    _: Annotated[None, Depends(_mark_telegram)],
) -> Response:
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