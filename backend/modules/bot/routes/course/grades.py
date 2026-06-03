import httpx
from aiogram import Router
from aiogram.filters import Command, CommandObject
from aiogram.types import CallbackQuery, Message
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.bot.keyboards.callback_factory import CourseGradesPage
from backend.modules.bot.services.grades import (
    build_grades_keyboard,
    build_grades_message,
    fetch_grades_page,
    get_grades_context,
    send_grades_page,
)

router = Router(name="Course grades router")


@router.message(Command("course"))
async def course_command(
    message: Message,
    command: CommandObject,
    db_session: AsyncSession,
    meilisearch_client: httpx.AsyncClient,
    redis: Redis,
    public_url: str,
) -> None:
    keyword = (command.args or "").strip()
    if not keyword:
        await message.answer("Использование: /course CODE\nПример: /course MATH 161")
        return

    await send_grades_page(
        message,
        db_session=db_session,
        meilisearch_client=meilisearch_client,
        redis=redis,
        keyword=keyword,
        page=1,
        public_url=public_url,
    )


@router.callback_query(CourseGradesPage.filter())
async def course_grades_page(
    callback: CallbackQuery,
    callback_data: CourseGradesPage,
    db_session: AsyncSession,
    meilisearch_client: httpx.AsyncClient,
    redis: Redis,
    public_url: str,
) -> None:
    if callback.message is None or callback.from_user is None:
        await callback.answer()
        return

    keyword = await get_grades_context(redis, callback.message.chat.id, callback.from_user.id)
    if not keyword:
        await callback.answer("Сессия истекла. Введите /course CODE снова.", show_alert=True)
        return

    response = await fetch_grades_page(
        db_session=db_session,
        meilisearch_client=meilisearch_client,
        keyword=keyword,
        page=callback_data.page,
    )
    text = build_grades_message(keyword, response, public_url)
    keyboard = build_grades_keyboard(response.page, response.total_pages)
    await callback.message.edit_text(text, parse_mode="HTML", reply_markup=keyboard)
    await callback.answer()
