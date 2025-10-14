import csv
import logging
from pathlib import Path
from typing import Dict, List, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database.manager import AsyncDatabaseManager
from backend.core.database.models.grade_report import Course


logger = logging.getLogger(__name__)


FIELD_LENGTHS: Dict[str, int] = {
    "course_code": 128,
    "pre_req": 2048,
    "anti_req": 2048,
    "co_req": 2048,
    "level": 128,
    "school": 128,
    "description": 4096,
    "department": 512,
    "title": 512,
    "term": 32,
}


def _convert_to_int(value: str | None) -> int | None:
    if value is None:
        return None
    stripped = value.strip()
    if stripped == "":
        return None
    try:
        return int(stripped)
    except (TypeError, ValueError):
        logger.warning("Failed to convert '%s' to int", value)
        return None


def _clean_text(
    value: str | None,
    *,
    field_name: str,
    required: bool,
    max_length: int | None,
) -> str | None:
    if value is None:
        if required:
            raise ValueError(f"Missing required field '{field_name}'")
        return None

    cleaned = value.strip()
    if cleaned == "":
        if required:
            raise ValueError(f"Missing required field '{field_name}'")
        return None

    cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n")

    if max_length is not None and len(cleaned) > max_length:
        logger.warning(
            "Value for field '%s' exceeds %s characters; truncating",
            field_name,
            max_length,
        )
        cleaned = cleaned[:max_length]

    return cleaned


def csv_row_to_new_course(row: Dict[str, str]) -> Course:
    registrar_id = _convert_to_int(row.get("registrar_id"))
    if registrar_id is None:
        raise ValueError("Missing or invalid registrar_id")

    course_code = _clean_text(
        row.get("course_code"),
        field_name="course_code",
        required=True,
        max_length=FIELD_LENGTHS["course_code"],
    )
    level = _clean_text(
        row.get("level"),
        field_name="level",
        required=True,
        max_length=FIELD_LENGTHS["level"],
    )
    school = _clean_text(
        row.get("school"),
        field_name="school",
        required=True,
        max_length=FIELD_LENGTHS["school"],
    )

    pre_req = _clean_text(
        row.get("pre_req"),
        field_name="pre_req",
        required=False,
        max_length=FIELD_LENGTHS["pre_req"],
    )
    anti_req = _clean_text(
        row.get("anti_req"),
        field_name="anti_req",
        required=False,
        max_length=FIELD_LENGTHS["anti_req"],
    )
    co_req = _clean_text(
        row.get("co_req"),
        field_name="co_req",
        required=False,
        max_length=FIELD_LENGTHS["co_req"],
    )
    description = _clean_text(
        row.get("description"),
        field_name="description",
        required=False,
        max_length=FIELD_LENGTHS["description"],
    )
    department = _clean_text(
        row.get("department"),
        field_name="department",
        required=False,
        max_length=FIELD_LENGTHS["department"],
    )
    title = _clean_text(
        row.get("title"),
        field_name="title",
        required=False,
        max_length=FIELD_LENGTHS["title"],
    )
    term = _clean_text(
        row.get("term"),
        field_name="term",
        required=False,
        max_length=FIELD_LENGTHS["term"],
    )
    credits = _convert_to_int(row.get("credits"))

    return Course(
        registrar_id=registrar_id,
        course_code=course_code,
        pre_req=pre_req,
        anti_req=anti_req,
        co_req=co_req,
        level=level,
        school=school,
        description=description,
        department=department,
        title=title,
        credits=credits,
        term=term,
    )


async def _commit_batch(
    session: AsyncSession,
    batch: List[Tuple[int, Dict[str, str]]],
    stats: Dict[str, int],
) -> None:
    if not batch:
        return

    try:
        await session.commit()
    except Exception as exc:
        await session.rollback()
        session.sync_session.expunge_all()
        logger.error(
            "Failed to commit batch of %s rows: %s",
            len(batch),
            exc,
        )

        for row_num, row_data in batch:
            try:
                new_course = csv_row_to_new_course(row_data)
                session.add(new_course)
                await session.commit()
                stats["inserted"] += 1
            except Exception as row_exc:
                await session.rollback()
                session.sync_session.expunge_all()
                stats["errors"] += 1
                logger.error("Failed to insert row %s: %s", row_num, row_exc)
                logger.error("Row data: %s", row_data)

        batch.clear()
        return

    stats["inserted"] += len(batch)
    batch.clear()


async def dump_csv_to_database(
    csv_file_path: str, db_manager: AsyncDatabaseManager, batch_size: int = 100
) -> Dict[str, int]:
    csv_path = Path(csv_file_path)
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV file not found: {csv_file_path}")

    stats = {"inserted": 0, "errors": 0}

    async with db_manager.async_session_maker() as session:
        try:
            with csv_path.open("r", encoding="utf-8") as csv_file:
                reader = csv.DictReader(csv_file)

                batch: List[Tuple[int, Dict[str, str]]] = []
                for row_num, row in enumerate(reader, start=2):
                    row_data = dict(row)
                    try:
                        new_course = csv_row_to_new_course(row_data)
                    except Exception as exc:
                        stats["errors"] += 1
                        logger.error("Error parsing row %s: %s", row_num, exc)
                        logger.error("Row data: %s", row_data)
                        continue

                    session.add(new_course)
                    batch.append((row_num, row_data))

                    if len(batch) >= batch_size:
                        await _commit_batch(session, batch, stats)

                if batch:
                    await _commit_batch(session, batch, stats)

                logger.info("CSV dump completed. Stats: %s", stats)
                return stats
        except Exception:
            await session.rollback()
            raise


async def dump_pcc_courses_csv(
    csv_file_path: str = "pcc_courses.csv", batch_size: int = 100
) -> Dict[str, int]:
    db_manager = AsyncDatabaseManager()
    try:
        return await dump_csv_to_database(
            csv_file_path=csv_file_path, db_manager=db_manager, batch_size=batch_size
        )
    finally:
        await db_manager.async_engine.dispose()


if __name__ == "__main__":
    import asyncio
    import sys

    csv_path = sys.argv[1] if len(sys.argv) > 1 else "pcc_courses.csv"

    async def _main() -> None:
        stats = await dump_pcc_courses_csv(csv_file_path=csv_path, batch_size=200)
        print(f"Inserted: {stats['inserted']}")
        print(f"Errors: {stats['errors']}")

    asyncio.run(_main())


