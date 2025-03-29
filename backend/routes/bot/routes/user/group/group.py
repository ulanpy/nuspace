
from aiogram import Router, F, Bot
from aiogram.types import Message, ChatMemberOwner, ChatMemberUpdated, ChatMemberAdministrator
from aiogram.enums.chat_type import ChatType
from aiogram.filters import ChatMemberUpdatedFilter, IS_NOT_MEMBER, MEMBER, and_f
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis
from celery.result import AsyncResult

from backend.routes.bot.utils import no_permissions
from backend.routes.bot.keyboards.kb import kb_register_groups
from backend.routes.bot.cruds import check_user_by_telegram_id
from backend.celery_app.tasks import schedule_kick
from backend.celery_app.celery_config import celery_app

router = Router(name="Group router")


@router.chat_member(
    (F.old_chat_member.is_member == True) &
    (F.new_chat_member.is_member == False)
)
async def on_user_left(event: ChatMemberUpdated):
    print(f"USER LEFT: {event.old_chat_member.user.id}")
    # Ваш код обработки выхода пользователя


@router.chat_member(
    (F.old_chat_member.is_member == False) &
    (F.new_chat_member.is_member == True)
)
async def on_user_joined(event: ChatMemberUpdated):
    print(f"USER JOINED: {event.new_chat_member.user.id}")
#
# async def handle_new_member(
#     user_id: int,
#     chat_id: int,
#     bot: Bot,
#     db_session: AsyncSession,
#     redis: Redis,
#     public_url: str,
#     message: Message = None
# ):
#     """Общая функция для обработки новых участников"""
#     if user_id == bot.id:
#         return
#
#     member = await bot.get_chat_member(chat_id=chat_id, user_id=user_id)
#     if isinstance(member, (ChatMemberOwner, ChatMemberAdministrator)):
#         return
#
#     if not await check_user_by_telegram_id(session=db_session, user_id=user_id):
#         sent_m = await bot.send_message(
#             chat_id=chat_id,
#             text="Зарегайся в NUspace, иначе в течений 15 минут будешь исключен",
#             reply_markup=kb_register_groups(url=public_url),
#             reply_to_message_id=message.message_id if message else None
#         )
#         await bot.restrict_chat_member(
#             chat_id=chat_id,
#             user_id=user_id,
#             permissions=no_permissions
#         )
#         task_id = f"celery:kick:{user_id}:{chat_id}:{sent_m.message_id}"
#         schedule_kick.apply_async(
#             args=[chat_id, user_id],
#             countdown=900,
#             task_id=task_id
#         )
#
#
# @router.chat_member(ChatMemberUpdatedFilter(IS_NOT_MEMBER >> MEMBER))
# async def on_user_joined(event: ChatMemberUpdated,
#                          db_session: AsyncSession,
#                          redis: Redis,
#                          public_url: str) -> None:
#     if event.new_chat_member.user.is_bot:
#         return
#     print(f"BBBBBBBBBBB{"JOIN EVENT:", event.model_dump_json()}")
#     await handle_new_member(
#         user_id=event.new_chat_member.user.id,
#         chat_id=event.chat.id,
#         bot=event.bot,
#         db_session=db_session,
#         redis=redis,
#         public_url=public_url
#     )
#
#
# @router.chat_member(ChatMemberUpdatedFilter(MEMBER >> IS_NOT_MEMBER))
# async def on_user_left(event: ChatMemberUpdated, redis: Redis):
#     user_id = event.old_chat_member.user.id
#     chat_id = event.chat.id
#     print(f"AAAAAAAAAAAAAAAAAAAA{event.model_dump_json()}")
#     keys = [key async for key in redis.scan_iter(f"celery:kick:{user_id}:{chat_id}:*")]
#     for key in keys:
#         _, _, _, _, msg_id = key.split(":")
#         result = AsyncResult(key, app=celery_app)
#         result.revoke(terminate=True)
#         await redis.delete(key)
#         await event.bot.delete_message(chat_id=chat_id, message_id=msg_id)
#

# @router.message(F.chat.type == ChatType.SUPERGROUP)
# async def new_member(m: Message,
#                      db_session: AsyncSession,
#                      redis: Redis,
#                      public_url: str):
#     if m.from_user.is_bot:
#         return
#     print("XXXXXXXXXXXXXXX")
#     await handle_new_member(
#         user_id=m.from_user.id,
#         chat_id=m.chat.id,
#         bot=m.bot,
#         db_session=db_session,
#         redis=redis,
#         public_url=public_url,
#         message=m
#     )