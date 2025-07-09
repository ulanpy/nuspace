from typing import Annotated

from aiogram.types import Update
from aiogram.utils.deep_linking import create_start_link
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_current_principals, get_db_session
from backend.core.configs.config import config
from backend.core.database.models import Product
from backend.routes.bot.cruds import find_product

web_router = APIRouter(tags=["Bot Routes"])


@web_router.post("/webhook")
async def webhook(request: Request) -> Response:
    received_token = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
    if received_token != config.TG_WEBHOOK_SECRET_TOKEN:
        return Response(status_code=status.HTTP_403_FORBIDDEN)

    bot = request.app.state.bot
    dp = request.app.state.dp
    update = Update.model_validate(await request.json(), context={"bot": bot})
    await dp.feed_update(bot, update)
    return Response(status_code=status.HTTP_200_OK)


@web_router.post("/contact/{product_id}")
async def contact(
    request: Request,
    product_id: int,
    user: Annotated[dict, Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
) -> str:
    product: Product | None = await find_product(db_session, int(product_id))
    if product:
        link: str = await create_start_link(
            request.app.state.bot, f"contact&{product_id}", encode=True
        )
        return link
    raise HTTPException(status_code=404, detail="Does not exist!")
