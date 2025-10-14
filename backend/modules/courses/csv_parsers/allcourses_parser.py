import csv
import logging
from pathlib import Path
from typing import Any, Dict

from backend.core.database.manager import AsyncDatabaseManager
from backend.core.database.models.grade_report import Course

logger = logging.getLogger(__name__)


def _convert_to_int(value: str) -> int | None:
    if value is None:
        return None
    value = value.strip()
    if value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        logger.warning(f"Failed to convert credits '{value}' to int")
        return None


def _convert_to_enum(enum_cls: Any, value: str) -> Any:
    if value is None:
        raise ValueError("Enum value cannot be None")
    name = value.strip()
    try:
        return enum_cls[name]
    except KeyError as e:
        # Try direct value match (in case CSV already matches enum values)
        for member in enum_cls:
            if member.value == name:
                return member
        raise ValueError(f"Invalid enum value '{name}' for {enum_cls.__name__}") from e


def csv_row_to_course(row: Dict[str, str]) -> Course:
    school = row.get("School", "")
    level = row.get("Level", "UG")
    course_code = (row.get("Course Abbr", "") or "").strip()
    section = (row.get("S/T", "") or "").strip() or None
    faculty = (row.get("Faculty", "") or "").strip() or None
    term = (row.get("Term", "") or "").strip() or None
    credits = _convert_to_int(row.get("Cr(ECTS)", ""))

    if not course_code:
        raise ValueError("Missing course code (Course Abbr)")

    return Course(
        school=school,
        level=level,
        course_code=course_code,
        section=section,
        faculty=faculty,
        credits=credits,
        term=term,
    )


async def dump_csv_to_database(
    csv_file_path: str, db_manager: AsyncDatabaseManager, batch_size: int = 100
) -> Dict[str, int]:
    csv_path = Path(csv_file_path)
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV file not found: {csv_file_path}")

    stats = {"inserted": 0, "errors": 0}

    async with db_manager.async_session_maker() as session:
        try:
            with open(csv_path, "r", encoding="utf-8") as csvfile:
                reader = csv.DictReader(csvfile)

                batch: list[Course] = []
                for row_num, row in enumerate(reader, start=2):
                    try:
                        course = csv_row_to_course(row)
                        session.add(course)
                        stats["inserted"] += 1
                        batch.append(course)

                        if len(batch) >= batch_size:
                            await session.commit()
                            logger.info(f"Processed batch of {len(batch)} course records")
                            batch = []
                    except Exception as e:
                        stats["errors"] += 1
                        logger.error(f"Error processing row {row_num}: {e}")
                        logger.error(f"Row data: {row}")
                        continue

                if batch:
                    await session.commit()
                    logger.info(f"Processed final batch of {len(batch)} course records")

                logger.info(f"CSV dump completed. Stats: {stats}")
                return stats
        except Exception:
            await session.rollback()
            raise


async def dump_allcourses_csv(
    csv_file_path: str = "allcourses.csv",
    batch_size: int = 100,
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

    csv_path = sys.argv[1] if len(sys.argv) > 1 else "allcourses.csv"

    async def _main() -> None:
        stats = await dump_allcourses_csv(csv_file_path=csv_path, batch_size=200)
        print(f"Inserted: {stats['inserted']}")
        print(f"Errors: {stats['errors']}")

    asyncio.run(_main())

