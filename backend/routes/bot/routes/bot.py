from fastapi import APIRouter, Request
from aiogram.types import Update

web_router = APIRouter()

@web_router.post("/webhook")
async def webhook(request:  Request) -> None:
    bot = request.app.state.bot
    dp = request.app.state.dp
    update = Update.model_validate(await request.json(), context={"bot": bot})
    await dp.feed_update(bot, update)