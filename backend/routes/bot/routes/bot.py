from fastapi import APIRouter, Request, Depends
from aiogram.types import Update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_db_session
from backend.routes.bot.apsheduler.tasks import scheduler_session


web_router = APIRouter()


@web_router.post("/webhook")
async def webhook(request:  Request, db_session: AsyncSession = Depends(get_db_session)) -> None:
    """
        Handles incoming webhook requests from Telegram.
        Extracts the bot and dispatcher (dp) from the app state.
        Attaches the database session to the dispatcher for use in handlers.
        Validates the incoming update from Telegram and processes it using the dispatcher.
    """
    bot = request.app.state.bot
    dp = request.app.state.dp
    scheduler = scheduler_session()
    scheduler.start()
    dp["scheduler_session"] = scheduler
    dp["db_session"] = db_session
    update = Update.model_validate(await request.json(), context={"bot": bot})
    await dp.feed_update(bot, update)