"""Dump NU registrar public course catalog search results into a CSV file.

This script iterates through the public course catalog search endpoint and writes
the returned course items to a CSV file page by page. Requests are executed
sequentially with a configurable delay (which can be set to zero) to avoid
overwhelming the upstream service. When no specific term is provided, the
script walks through every semester returned by the registrar API in the order
they are reported.
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import logging
import sys
from enum import Enum
from pathlib import Path
from typing import Iterable, TextIO


def _ensure_project_root_on_path() -> None:
    """Ensure the project root is available on ``sys.path`` for imports."""

    script_path = Path(__file__).resolve()
    try:
        project_root = script_path.parents[4]
    except IndexError as exc:  # pragma: no cover - defensive
        raise RuntimeError("Failed to resolve project root from script location") from exc

    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))


_ensure_project_root_on_path()

from backend.modules.courses.crashed.registrar.public_course_catalog import (  # noqa: E402
    PublicCourseCatalogClient,
)


LOGGER = logging.getLogger("pcc_search_dump")


FIELDNAMES: list[str] = [
    "registrar_id",
    "course_code",
    "pre_req",
    "anti_req",
    "co_req",
    "level",
    "school",
    "description",
    "department",
    "title",
    "credits",
    "term",
]


def _write_page_items(
    writer: csv.DictWriter,
    csv_file: TextIO,
    items: Iterable[dict[str, object]],
) -> int:
    """Write the provided items to the CSV file and flush the buffer."""

    count = 0
    for item in items:
        writer.writerow({key: _serialize_value(item.get(key)) for key in FIELDNAMES})
        count += 1

    csv_file.flush()
    return count


def _serialize_value(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, (int, float)):
        return str(value)
    return str(value)


async def dump_catalog_to_csv(
    term: str | None,
    output_path: Path,
    *,
    start_page: int = 1,
    end_page: int = 4280,
    level: str | None = None,
    limit: int = 100,
    delay_seconds: float = 2.0,
) -> None:
    """Dump PCC search results for the given term to ``output_path``.

    The function iterates through the pages sequentially and respects the
    specified delay between requests (set ``delay_seconds`` to ``0`` to disable
    waiting). When ``term`` is ``None`` the registrar search is executed for
    every semester returned by ``getSemesters``.
    """

    if start_page < 1:
        raise ValueError("start_page must be >= 1")
    if end_page < start_page:
        raise ValueError("end_page must be >= start_page")

    if delay_seconds < 0:
        raise ValueError("delay_seconds must be >= 0")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    file_exists = output_path.exists()
    mode = "a" if file_exists else "w"
    with output_path.open(mode, newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=FIELDNAMES)
        if not file_exists:
            writer.writeheader()

        async with PublicCourseCatalogClient(limit=limit) as client:
            if term is not None:
                term_ids = [term]
            else:
                semesters = await client.get_semesters()
                term_ids = [
                    entry["value"]
                    for entry in semesters
                    if entry.get("value")
                ]
                if not term_ids:
                    LOGGER.warning("Registrar returned no semesters; aborting dump")
                    return

            for term_id in term_ids:
                LOGGER.info("Processing term %s", term_id)
                page = start_page
                while page <= end_page:
                    LOGGER.info("Fetching term %s page %s", term_id, page)
                    try:
                        response = await client.search(
                            query=None,
                            term=term_id,
                            level=level,
                            page=page,
                        )
                    except ValueError as exc:
                        LOGGER.error(
                            "Failed to fetch page %s for term %s: %s", page, term_id, exc
                        )
                        LOGGER.info("Stopping further requests for term %s", term_id)
                        break

                    items = response.get("items", [])
                    if not items:
                        LOGGER.info(
                            "No items returned for term %s page %s; stopping",
                            term_id,
                            page,
                        )
                        break

                    written = _write_page_items(writer, csv_file, items)
                    LOGGER.info(
                        "Written %s items from term %s page %s", written, term_id, page
                    )

                    next_page = response.get("cursor")
                    if not next_page or next_page <= page:
                        LOGGER.info(
                            "No further pages indicated for term %s after page %s",
                            term_id,
                            page,
                        )
                        break

                    page = next_page
                    if page > end_page:
                        break

                    if delay_seconds:
                        await asyncio.sleep(delay_seconds)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Dump NU registrar public course catalog results to CSV",
    )
    parser.add_argument(
        "term",
        nargs="?",
        default=None,
        help="Registrar term identifier (value from PCC getSemesters endpoint)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("pcc_courses.csv"),
        help="Destination CSV file (default: %(default)s)",
    )
    parser.add_argument(
        "--start-page",
        type=int,
        default=1,
        help="First page to request (default: %(default)s)",
    )
    parser.add_argument(
        "--end-page",
        type=int,
        default=4280,
        help="Last page to request (default: %(default)s)",
    )
    parser.add_argument(
        "--level",
        default=None,
        help="Academic level filter (e.g. UG, GrM, PhD). Default is registrar default.",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=2.0,
        help="Delay in seconds between requests (default: %(default)s, set 0 to disable)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=100,
        help="Page size for PCC search (default: %(default)s)",
    )

    return parser.parse_args(argv)


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )


def main(argv: list[str]) -> None:
    configure_logging()
    args = parse_args(argv)

    asyncio.run(
        dump_catalog_to_csv(
            term=args.term,
            output_path=args.output,
            start_page=args.start_page,
            end_page=args.end_page,
            level=args.level,
            limit=args.limit,
            delay_seconds=args.delay,
        )
    )


if __name__ == "__main__":
    main(sys.argv[1:])


