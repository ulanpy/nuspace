import csv
import logging
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict

from backend.core.database.manager import AsyncDatabaseManager
from backend.core.database.models.grade_report import GradeReport

logger = logging.getLogger(__name__)

_CSVS_DIR = Path(__file__).resolve().parent / "csvs"


def resolve_grades_csv_path(csv_arg: str) -> Path:
    """
    Resolve a grades CSV path: file must exist under ``csvs/`` next to this module.
    A single path component (e.g. ``FA2025.csv`` or ``grades.csv``) is resolved as
    ``csvs/<name>``.
    """
    raw = (csv_arg or "").strip()
    if not raw:
        raise ValueError("CSV filename or path is required.")

    p = Path(raw)
    if len(p.parts) == 1 and not raw.startswith(("/", "\\")):
        p = _CSVS_DIR / p.name
    else:
        p = p.expanduser()

    resolved = p.resolve()
    csvs = _CSVS_DIR.resolve()
    try:
        resolved.relative_to(csvs)
    except ValueError as e:
        raise ValueError(
            f"CSV must be inside {csvs} (got {resolved}). "
            "Pass a basename or a path under csvs/."
        ) from e

    if not resolved.is_file():
        raise FileNotFoundError(f"CSV not found: {resolved}")
    return resolved


def convert_csv_value(value: str, field_type: str) -> Any:
    """
    Convert CSV string values to appropriate Python types for database insertion.

    Args:
        value: String value from CSV
        field_type: Expected type ('int', 'float', 'str', 'decimal')

    Returns:
        Converted value or None if conversion fails
    """
    if not value or value.strip() == "":
        return None

    value = value.strip()

    try:
        if field_type == "int":
            return int(value)
        elif field_type == "float":
            return float(value)
        elif field_type == "decimal":
            return Decimal(value)
        elif field_type == "str":
            return value
        else:
            return value
    except (ValueError, TypeError) as e:
        logger.warning(f"Failed to convert value '{value}' to {field_type}: {e}")
        return None


def csv_row_to_grade_report(row: Dict[str, str]) -> GradeReport:
    """
    Convert a CSV row dictionary to a GradeReport model instance.

    Args:
        row: Dictionary representing a CSV row

    Returns:
        GradeReport instance
    """
    # Define field type mappings
    field_types = {
        "course_code": "str",
        "course_title": "str",
        "section": "str",
        "grades_count": "int",
        "avg_gpa": "decimal",
        "std_dev": "decimal",
        "median_gpa": "decimal",
        "pct_A": "decimal",
        "pct_B": "decimal",
        "pct_C": "decimal",
        "pct_D": "decimal",
        "pct_F": "decimal",
        "pct_P": "decimal",
        "pct_I": "decimal",
        "pct_AU": "decimal",
        "pct_W_AW": "decimal",
        "letters_count": "int",
        "term": "str",
        "faculty": "str",
    }

    # Convert values to appropriate types
    converted_data = {}
    for field, field_type in field_types.items():
        converted_data[field] = convert_csv_value(row.get(field, ""), field_type)

    return GradeReport(**converted_data)


async def dump_csv_to_database(
    csv_file_path: str, db_manager: AsyncDatabaseManager, batch_size: int = 100
) -> Dict[str, int]:
    """
    Dump CSV data into the PostgreSQL database without duplicate checking.

    Args:
        csv_file_path: Path to the CSV file
        db_manager: Database manager instance
        batch_size: Number of records to process in each batch

    Returns:
        Dictionary with statistics: {'inserted': int, 'errors': int}
    """
    csv_path = Path(csv_file_path)
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV file not found: {csv_file_path}")

    stats = {"inserted": 0, "errors": 0}

    async with db_manager.async_session_maker() as session:
        try:
            with open(csv_path, "r", encoding="utf-8") as csvfile:
                reader = csv.DictReader(csvfile)

                batch = []
                for row_num, row in enumerate(
                    reader, start=2
                ):  # Start at 2 because header is row 1
                    try:
                        # Convert CSV row to GradeReport instance
                        grade_report = csv_row_to_grade_report(row)

                        # Add record to batch (no duplicate checking)
                        session.add(grade_report)
                        stats["inserted"] += 1
                        batch.append(grade_report)

                        # Process batch when it reaches batch_size
                        if len(batch) >= batch_size:
                            await session.commit()
                            logger.info(f"Processed batch of {len(batch)} records")
                            batch = []

                    except Exception as e:
                        stats["errors"] += 1
                        logger.error(f"Error processing row {row_num}: {e}")
                        logger.error(f"Row data: {row}")
                        continue

                # Process remaining records in the last batch
                if batch:
                    await session.commit()
                    logger.info(f"Processed final batch of {len(batch)} records")

                logger.info(f"CSV dump completed. Stats: {stats}")
                return stats

        except Exception as e:
            await session.rollback()
            logger.error(f"Error during CSV dump: {e}")
            raise


async def dump_grades_csv(csv_file_path: str, batch_size: int = 100) -> Dict[str, int]:
    """
    Load a grades CSV from ``csvs/`` into the database.

    Args:
        csv_file_path: Path or basename; must resolve to an existing file under ``csvs/``.
        batch_size: Number of records to process in each batch

    Returns:
        Dictionary with statistics: {'inserted': int, 'errors': int}
    """
    resolved = resolve_grades_csv_path(csv_file_path)

    # Create database manager
    db_manager = AsyncDatabaseManager()

    try:
        return await dump_csv_to_database(
            csv_file_path=str(resolved), db_manager=db_manager, batch_size=batch_size
        )
    finally:
        await db_manager.async_engine.dispose()


async def analyze_csv_duplicates(csv_file_path: str) -> Dict[str, Any]:
    """
    Analyze the CSV file to identify duplicate patterns and provide insights.

    Args:
        csv_file_path: Same rules as :func:`resolve_grades_csv_path`.

    Returns:
        Dictionary with analysis results
    """
    csv_path = resolve_grades_csv_path(csv_file_path)

    analysis = {
        "total_rows": 0,
        "unique_course_section_term": set(),
        "unique_course_section_term_faculty": set(),
        "duplicates_by_course_section_term": {},
        "duplicates_by_course_section_term_faculty": {},
        "sample_duplicates": [],
    }

    with open(csv_path, "r", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)

        for row_num, row in enumerate(reader, start=2):
            analysis["total_rows"] += 1

            course_code = row.get("course_code", "").strip()
            section = row.get("section", "").strip()
            term = row.get("term", "").strip()
            faculty = row.get("faculty", "").strip()

            # Create keys for comparison
            key_course_section_term = f"{course_code}|{section}|{term}"
            key_course_section_term_faculty = f"{course_code}|{section}|{term}|{faculty}"

            # Track unique combinations
            analysis["unique_course_section_term"].add(key_course_section_term)
            analysis["unique_course_section_term_faculty"].add(key_course_section_term_faculty)

            # Count duplicates by course_section_term
            if key_course_section_term in analysis["duplicates_by_course_section_term"]:
                analysis["duplicates_by_course_section_term"][key_course_section_term] += 1
            else:
                analysis["duplicates_by_course_section_term"][key_course_section_term] = 1

            # Count duplicates by course_section_term_faculty
            if (
                key_course_section_term_faculty
                in analysis["duplicates_by_course_section_term_faculty"]
            ):
                analysis["duplicates_by_course_section_term_faculty"][
                    key_course_section_term_faculty
                ] += 1
            else:
                analysis["duplicates_by_course_section_term_faculty"][
                    key_course_section_term_faculty
                ] = 1

            # Collect sample duplicates for the first few
            if (
                analysis["duplicates_by_course_section_term"][key_course_section_term] > 1
                and len(analysis["sample_duplicates"]) < 5
            ):
                analysis["sample_duplicates"].append(
                    {
                        "row": row_num,
                        "course_code": course_code,
                        "section": section,
                        "term": term,
                        "faculty": faculty,
                        "key": key_course_section_term,
                    }
                )

    # Calculate statistics
    analysis["unique_course_section_term_count"] = len(analysis["unique_course_section_term"])
    analysis["unique_course_section_term_faculty_count"] = len(
        analysis["unique_course_section_term_faculty"]
    )

    # Find actual duplicates (count > 1)
    analysis["duplicate_course_section_term"] = {
        k: v for k, v in analysis["duplicates_by_course_section_term"].items() if v > 1
    }
    analysis["duplicate_course_section_term_faculty"] = {
        k: v for k, v in analysis["duplicates_by_course_section_term_faculty"].items() if v > 1
    }

    return analysis


if __name__ == "__main__":
    import argparse
    import asyncio
    import sys

    parser = argparse.ArgumentParser(
        description="Load grades CSV into PostgreSQL. File must be under csv_parsers/csvs/."
    )
    parser.add_argument(
        "csv_file",
        help="Basename (e.g. FA2025.csv) or path under csvs/.",
    )
    parser.add_argument(
        "--analyze",
        action="store_true",
        help="Only print duplicate analysis; do not write to the database.",
    )
    args = parser.parse_args()

    async def _run():
        try:
            if args.analyze:
                analysis = await analyze_csv_duplicates(args.csv_file)
                print(f"Total rows: {analysis['total_rows']}")
                print(
                    "Unique course+section+term:",
                    analysis["unique_course_section_term_count"],
                )
                print(
                    "Unique course+section+term+faculty:",
                    analysis["unique_course_section_term_faculty_count"],
                )
                if analysis["sample_duplicates"]:
                    print("Sample duplicates:")
                    for sample in analysis["sample_duplicates"][:5]:
                        print(
                            f"  {sample['course_code']} {sample['section']} "
                            f"{sample['term']} — {sample['faculty']}"
                        )
            else:
                stats = await dump_grades_csv(csv_file_path=args.csv_file)
                print(f"Inserted: {stats['inserted']}, errors: {stats['errors']}")
        except (ValueError, FileNotFoundError) as e:
            print(f"Error: {e}", file=sys.stderr)
            raise SystemExit(1) from e

    asyncio.run(_run())
