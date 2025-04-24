from typing import Callable

from aiogram import F, Router
from aiogram.types import Message, ReplyKeyboardRemove
from sqlalchemy.ext.asyncio import AsyncSession

from backend.routes.bot.cruds import check_user_by_telegram_id
from backend.routes.bot.keyboards.kb import get_user_selector_kb

router = Router()


@router.message(F.forward_from)
async def student_validator(
    m: Message, db_session: AsyncSession, _: Callable[[str], str]
) -> None:
    user = m.forward_from
    user_exist: bool = await check_user_by_telegram_id(
        session=db_session, user_id=user.id
    )
    answer: str = (
        _("✅Есть в базе NUspace") if user_exist else _("⛔️Нету в базе NUspace")
    )
    await m.answer(answer)


@router.message(F.forward_sender_name)
async def handle_hidden_forward(m: Message, _: Callable[[str], str]) -> None:
    await m.answer(
        _(
            "⛔️К сожелению из-за настроек конфиденциальности пользователя это недоступно, но есть другой вариант!"
        ),
        reply_markup=get_user_selector_kb(_=_),
    )


@router.message(F.user_shared)
async def handle_user_shared(
    message: Message, db_session: AsyncSession, _: Callable[[str], str]
) -> None:
    user_shared = message.user_shared
    selected_user = user_shared.user_id
    user_exist: bool = await check_user_by_telegram_id(
        session=db_session, user_id=selected_user
    )
    answer: str = (
        _("✅Есть в базе NUspace") if user_exist else _("⛔️Нету в базе NUspace")
    )
    await message.answer(answer, reply_markup=ReplyKeyboardRemove())
