from datetime import datetime, timedelta
from aiogram import Router, F
from aiogram.types import Message
from aiogram.enums.chat_type import ChatType
from aiogram. types. chat_permissions import ChatPermissions
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis

from backend.routes.bot.keyboards.kb import kb_register_groups
from backend.routes.bot.cruds import check_user_by_telegram_id
from backend.celery_app.tasks import schedule_kick


router = Router(name="Group router")


@router.message(F.chat.type == ChatType.SUPERGROUP)
async def new_member(m: Message,
                     db_session: AsyncSession,
                     redis: Redis):
    if m.from_user.id == m.bot.id:
        return

    if not await check_user_by_telegram_id(session=db_session, user_id=m.from_user.id):
        sent_m = await m.reply("Зарегайся в NUspace, иначе в течений 15 минут будешь исключен", reply_markup=kb_register_groups())
        await m.bot.restrict_chat_member(chat_id=m.chat.id,
                                         user_id=m.from_user.id,
                                         permissions=ChatPermissions(
                                                                    can_send_messages=False,
                                                                    can_send_audios=False,
                                                                    can_send_documents=False,
                                                                    can_send_photos=False,
                                                                    can_send_videos=False,
                                                                    can_send_video_notes=False,
                                                                    can_send_voice_notes=False,
                                                                    can_send_polls=False,
                                                                    can_send_other_messages=False,
                                                                    can_add_web_page_previews=False,
                                                                    can_change_info=False,
                                                                    can_invite_users=False,
                                                                    can_pin_messages=False,
                                                                    can_manage_topics=False
                                                                    )
                                         )
        task_id = f"celery:kick:{m.from_user.id}:{m.chat.id}:{sent_m.message_id}"
        await redis.ping()
        schedule_kick.apply_async(
            args=[m.chat.id, m.from_user.id],
            countdown=5,
            task_id=task_id
        )