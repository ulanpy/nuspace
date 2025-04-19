from typing import Annotated

from aiogram.types import Update
from aiogram.utils.deep_linking import create_start_link
from fastapi import APIRouter, Depends, Request, Response, status

from backend.common.dependencies import check_token
from backend.core.configs.config import config

web_router = APIRouter(tags=["Bot Routes"])


@web_router.post("/webhook")
async def webhook(request: Request) -> Response:
    """
    Handles incoming webhook requests from Telegram.
    Extracts the bot and dispatcher (dp) from the app state.
    Attaches the database and scheduler session to the dispatcher for use in handlers.
    Validates the incoming update from Telegram and processes it using the dispatcher.
    """
    received_token = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
    if received_token != config.SECRET_TOKEN:
        return Response(status_code=status.HTTP_403_FORBIDDEN)

    bot = request.app.state.bot
    dp = request.app.state.dp
    update = Update.model_validate(await request.json(), context={"bot": bot})
    await dp.feed_update(bot, update)
    return Response(status_code=status.HTTP_200_OK)


@web_router.post("/contact/{product_id}")
async def contact(
    request: Request, product_id: int, user: Annotated[dict, Depends(check_token)]
) -> str:
    link: str = await create_start_link(
        request.app.state.bot, f"contact&{product_id}", encode=True
    )
    return link
