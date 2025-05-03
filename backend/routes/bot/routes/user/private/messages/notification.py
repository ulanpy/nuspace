from typing import Callable

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message
from redis.asyncio import Redis

from backend.routes.bot.keyboards.kb import notifications_keyboard
from backend.routes.bot.utils.enums import NotificationEnum

router = Router()


@router.message(Command("notification"))
async def notification_settings(m: Message, _: Callable[[str], str], redis: Redis):
    key_exist: bool = await redis.exists(f"notification:{m.from_user.id}")
    action = NotificationEnum.DISABLE if not key_exist else NotificationEnum.ENABLE

    await m.answer(_("🔔Уведомления"), reply_markup=notifications_keyboard(action=action, _=_))
