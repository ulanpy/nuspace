from typing import Callable

from aiogram import F, Router
from aiogram.types import Message, ReplyKeyboardRemove
from sqlalchemy.ext.asyncio import AsyncSession

from backend.routes.bot.cruds import check_user_by_telegram_id
from backend.routes.bot.keyboards.kb import get_user_selector_kb, kb_url

router = Router()


@router.message(F.forward_from)
async def student_validator(
    m: Message, db_session: AsyncSession, _: Callable[[str], str], public_url: str
):
    user_protect: bool = await check_user_by_telegram_id(session=db_session, user_id=m.from_user.id)
    if not user_protect:
        return await m.answer(_("⛔️Нет доступа"), reply_markup=kb_url(url=public_url))

    user = m.forward_from
    user_exist: bool = await check_user_by_telegram_id(session=db_session, user_id=user.id)
    answer: str = _("✅Есть в базе NUspace") if user_exist else _("⛔️Нету в базе NUspace")
    await m.answer(answer)


@router.message(F.forward_sender_name)
async def handle_hidden_forward(
    m: Message, db_session: AsyncSession, _: Callable[[str], str], public_url: str
):
    user_protect: bool = await check_user_by_telegram_id(session=db_session, user_id=m.from_user.id)
    if not user_protect:
        return await m.answer(_("⛔️Нет доступа"), reply_markup=kb_url(url=public_url))

    await m.answer(
        _(
            "⛔️К сожелению из-за настроек конфиденциальности пользователя "
            "это недоступно, но есть другой вариант!"
        ),
        reply_markup=get_user_selector_kb(_=_),
    )


@router.message(F.user_shared)
async def handle_user_shared(
    m: Message, db_session: AsyncSession, _: Callable[[str], str], public_url: str
):
    user_protect: bool = await check_user_by_telegram_id(session=db_session, user_id=m.from_user.id)
    if not user_protect:
        return await m.answer(_("⛔️Нет доступа"), reply_markup=kb_url(url=public_url))

    user_shared = m.user_shared
    selected_user = user_shared.user_id
    user_exist: bool = await check_user_by_telegram_id(session=db_session, user_id=selected_user)
    answer: str = _("✅Есть в базе NUspace") if user_exist else _("⛔️Нету в базе NUspace")
    await m.answer(answer, reply_markup=ReplyKeyboardRemove())
