from datetime import datetime, timedelta

from aiogram import Router, F
from aiogram.types import Message, ContentType
from aiogram.enums.chat_type import ChatType
from sqlalchemy.ext.asyncio import AsyncSession
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from backend.routes.bot.apsheduler.tasks import kick_user
from backend.routes.bot.keyboards.kb import kb_webapp
from backend.routes.bot.cruds import check_user_by_telegram_id

router = Router(name="Group router")


@router.message(F.chat.type == ChatType.SUPERGROUP)
async def new_member(m: Message,
                     db_session: AsyncSession,
                     scheduler_session: AsyncIOScheduler):
    if m.from_user.id == m.bot.id:
        return

    if not await check_user_by_telegram_id(session=db_session, user_id=m.from_user.id):
        await m.reply("Зарегайся в NUspace, иначе в течений 15 минут будешь исключен")
        run_time = datetime.now() + timedelta(seconds=10)
        scheduler_session.add_job(kick_user, 'date', run_date=run_time, args=[m.chat.id, m.from_user.id, m.bot])
