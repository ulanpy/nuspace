from typing import Callable

from aiogram import F, Router
from aiogram.types import CallbackQuery
from redis.asyncio import Redis

from backend.routes.bot.keyboards.callback_factory import NotificationAction
from backend.routes.bot.utils.enums import NotificationEnum

router = Router()


@router.callback_query(NotificationAction.filter(F.action == NotificationEnum.DISABLE))
async def disable_notifications(c: CallbackQuery, redis: Redis, _: Callable[[str], str]):
    key = f"notification:{c.from_user.id}"
    await redis.set(key, "off")
    await c.message.answer(_("⛔️Уведомления отключены"))
    await c.message.delete()


@router.callback_query(NotificationAction.filter(F.action == NotificationEnum.ENABLE))
async def enable_notifications(c: CallbackQuery, redis: Redis, _: Callable[[str], str]):
    key = f"notification:{c.from_user.id}"
    await redis.delete(key)
    await c.message.answer(_("✅Уведомления включены"))
    await c.message.delete()
