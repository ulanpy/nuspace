import httpx
from urllib.parse import quote

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.bot.consts import GRADES_PAGE_SIZE
from backend.modules.bot.keyboards.callback_factory import CourseGradesPage
from backend.modules.courses.statistics import schemas
from backend.modules.courses.statistics.service import list_grade_reports

GRADES_CTX_TTL_SECONDS = 3600


def grades_context_key(chat_id: int, user_id: int) -> str:
    return f"bot:grades:ctx:{chat_id}:{user_id}"


async def set_grades_context(redis: Redis, chat_id: int, user_id: int, keyword: str) -> None:
    await redis.set(grades_context_key(chat_id, user_id), keyword, ex=GRADES_CTX_TTL_SECONDS)


async def get_grades_context(redis: Redis, chat_id: int, user_id: int) -> str | None:
    value = await redis.get(grades_context_key(chat_id, user_id))
    if value is None:
        return None
    return value.decode() if isinstance(value, bytes) else value


def _pct(value: float | None) -> str:
    if value is None:
        return "—"
    return f"{value:.0f}%"


def _gpa(value: float | None) -> str:
    if value is None:
        return "—"
    return f"{value:.2f}"


def format_grade_item(grade: schemas.BaseGradeReportSchema) -> str:
    section = grade.section or "?"
    term = grade.term or "?"
    title = grade.course_title or "—"
    faculty = f"\n👤 {grade.faculty}" if grade.faculty else ""
    return (
        f"<b>{grade.course_code}-{section}</b> · {term}\n"
        f"{title}{faculty}\n"
        f"GPA {_gpa(grade.avg_gpa)} · med {_gpa(grade.median_gpa)} · n={grade.grades_count or 0}\n"
        f"A {_pct(grade.pct_A)} · B {_pct(grade.pct_B)} · C {_pct(grade.pct_C)} · "
        f"D {_pct(grade.pct_D)} · F {_pct(grade.pct_F)}"
    )


def build_site_grades_url(public_url: str, keyword: str) -> str:
    base = public_url.rstrip("/")
    return f"{base}/courses/?tab=course-stats&keyword={quote(keyword)}"


def build_grades_message(
    keyword: str, response: schemas.ListGradeReportResponse, public_url: str
) -> str:
    site_link = build_site_grades_url(public_url, keyword)
    footer = f'\n<a href="{site_link}">смотреть на сайте</a>'

    if not response.items:
        return f'📊 По запросу "<b>{keyword}</b>" ничего не найдено.{footer}'

    lines = [
        f'📊 <b>{keyword}</b> — стр. {response.page}/{response.total_pages} '
        f"({response.total} секций)",
        "",
    ]
    lines.extend(format_grade_item(item) for item in response.items)
    lines.append(footer)
    return "\n\n".join(lines)


def build_grades_keyboard(page: int, total_pages: int) -> InlineKeyboardMarkup | None:
    if total_pages <= 1:
        return None

    row: list[InlineKeyboardButton] = []
    if page > 1:
        row.append(
            InlineKeyboardButton(
                text="◀️ Назад",
                callback_data=CourseGradesPage(page=page - 1).pack(),
            )
        )
    if page < total_pages:
        row.append(
            InlineKeyboardButton(
                text="Вперёд ▶️",
                callback_data=CourseGradesPage(page=page + 1).pack(),
            )
        )
    return InlineKeyboardMarkup(inline_keyboard=[row])


async def fetch_grades_page(
    *,
    db_session: AsyncSession,
    meilisearch_client: httpx.AsyncClient,
    keyword: str,
    page: int,
) -> schemas.ListGradeReportResponse:
    return await list_grade_reports(
        session=db_session,
        meilisearch_client=meilisearch_client,
        keyword=keyword,
        page=page,
        size=GRADES_PAGE_SIZE,
    )


async def send_grades_page(
    message: Message,
    *,
    db_session: AsyncSession,
    meilisearch_client: httpx.AsyncClient,
    redis: Redis,
    keyword: str,
    page: int,
    public_url: str,
) -> None:
    if message.from_user is None:
        return

    await set_grades_context(redis, message.chat.id, message.from_user.id, keyword)
    response = await fetch_grades_page(
        db_session=db_session,
        meilisearch_client=meilisearch_client,
        keyword=keyword,
        page=page,
    )
    text = build_grades_message(keyword, response, public_url)
    keyboard = build_grades_keyboard(response.page, response.total_pages)
    await message.answer(text, parse_mode="HTML", reply_markup=keyboard)
