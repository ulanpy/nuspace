from datetime import datetime, timedelta, timezone



from aiogram import Router, F
from aiogram.types import Message, ContentType
from aiogram.enums.chat_type import ChatType
from sqlalchemy.ext.asyncio import AsyncSession
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from backend.routes.bot.apsheduler.tasks import kick_user
from backend.routes.bot.keyboards.kb import kb_webapp
from backend.routes.bot.cruds import check_user_by_telegram_id
from backend.core.database.manager import AsyncDatabaseManager
router = Router(name="Group router")


@router.message(F.chat.type == ChatType.SUPERGROUP)
async def new_member(m: Message,
                     db_manager: AsyncDatabaseManager,
                     scheduler_session: AsyncIOScheduler):
    if m.from_user.id == m.bot.id:
        return

    async for session in db_manager.get_async_session():
        user_exists = await check_user_by_telegram_id(session=session, user_id=m.from_user.id)
        if not user_exists:
            await m.reply("Зарегайся в NUspace, иначе в течение 15 минут будешь исключен")
            run_time = datetime.now(timezone.utc) + timedelta(seconds=5)
            scheduler_session.add_job(kick_user, 'date', run_date=run_time, args=[m.chat.id, m.from_user.id, m.bot])
        break  # We only need one session instance.