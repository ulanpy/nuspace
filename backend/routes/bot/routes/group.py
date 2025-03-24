
from aiogram import Router, F
from aiogram.types import Message
from aiogram.enums.chat_type import ChatType
from sqlalchemy.ext.asyncio import AsyncSession


# from backend.routes.bot.apsheduler.tasks import kick_user_task
from backend.routes.bot.keyboards.kb import kb_register_groups
from backend.routes.bot.cruds import check_user_by_telegram_id


router = Router(name="Group router")


@router.message(F.chat.type == ChatType.SUPERGROUP)
async def new_member(m: Message,
                     db_session: AsyncSession):
    if m.from_user.id == m.bot.id:
        return

    user_exists = await check_user_by_telegram_id(session=db_session, user_id=m.from_user.id)
    if not user_exists:
        await m.bot.send_message(m.chat.id, f"Зарегайся в NUspace, иначе в течение 15 минут будешь исключен", reply_markup=kb_register_groups())
    # kick_user_task.apply_async(args=[m.chat.id, m.from_user.id, m.bot.token], countdown=10)