
from aiogram import Router, F
from aiogram.types import Message
from aiogram.enums.chat_type import ChatType
from sqlalchemy.ext.asyncio import AsyncSession


# from backend.routes.bot.apsheduler.tasks import kick_user_task
from backend.routes.bot.keyboards.kb import kb_register_groups
from backend.routes.bot.cruds import check_user_by_telegram_id
from backend.celery_app.tasks import schedule_kick


router = Router(name="Group router")


@router.message(F.chat.type == ChatType.SUPERGROUP)
async def new_member(m: Message,
                     db_session: AsyncSession):
    if m.from_user.id == m.bot.id:
        return

    if not await check_user_by_telegram_id(session=db_session, user_id=m.from_user.id):
        await m.reply("Зарегайся в NUspace, иначе в течений 15 минут будешь исключен")
        run_time = datetime.now() + timedelta(seconds=10)
        # Schedule task with 10 seconds delay
        schedule_kick.apply_async(
            args=[m.chat.id, m.from_user.id],
            countdown=60  # Delay in seconds
        )