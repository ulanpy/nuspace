from fastapi import APIRouter, Request, Depends
from aiogram.types import Update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_db_session

web_router = APIRouter()


@web_router.post("/webhook")
async def webhook(request:  Request, db_session: AsyncSession = Depends(get_db_session)) -> None:
    bot = request.app.state.bot
    dp = request.app.state.dp
    dp["db_session"] = db_session
    update = Update.model_validate(await request.json(), context={"bot": bot})
    await dp.feed_update(bot, update)