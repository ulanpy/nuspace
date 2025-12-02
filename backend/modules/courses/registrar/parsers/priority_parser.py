import io
import re
from typing import Iterable, List, Sequence

import pdfplumber


def clean_cell(value: str | None) -> str:
    """Collapse whitespace and replace newlines inside a cell."""
    if value is None:
        return ""
    return " ".join(value.split())


def is_course_row(first_cell: str) -> bool:
    """Return True when the row starts with a numeric index."""
    return bool(re.fullmatch(r"\d+", first_cell))


def is_school_heading(first_cell: str) -> bool:
    """Detect top-level headings (e.g., GSB, SEDS, GSE)."""
    return first_cell.isupper() and " " not in first_cell and len(first_cell) <= 5


def iter_tables(pdf_bytes: bytes) -> Iterable[Sequence[Sequence[str | None]]]:
    """Yield all tables from every page inside the provided PDF bytes."""
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables() or []
            for table in tables:
                if table:
                    yield table
            page.flush_cache()


def parse_pdf(pdf_bytes: bytes) -> List[dict]:
    """Parse the PDF into a list of course dicts ready for Meilisearch ingestion."""
    rows: List[dict] = []

    def cell_value(cells: list[str], index: int) -> str:
        return cells[index] if index < len(cells) else ""

    for table in iter_tables(pdf_bytes):
        for raw_row in table or []:
            cells = [clean_cell(cell) for cell in raw_row]
            if not any(cells):
                continue

            first_cell = cells[0]
            if first_cell == "#":
                continue

            if is_course_row(first_cell):
                course_id = int(first_cell)
                rows.append(
                    {
                        "id": course_id,
                        "abbr": cell_value(cells, 1),
                        "title": cell_value(cells, 2),
                        "prerequisite": cell_value(cells, 5),
                        "corequisite": cell_value(cells, 6),
                        "antirequisite": cell_value(cells, 7),
                        "priority_1": cell_value(cells, 8),
                        "priority_2": cell_value(cells, 9),
                        "priority_3": cell_value(cells, 10),
                        "priority_4": cell_value(cells, 11),
                    }
                )
                continue

    return rows