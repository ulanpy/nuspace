from __future__ import annotations

import io
from typing import Any, Dict, List, Sequence

import pdfplumber


def _normalize_code(value: str | None) -> str:
    if not value:
        return ""
    return " ".join(value.split()).upper()


def _clean_header(cell: Any) -> str:
    if cell is None:
        return ""
    return str(cell).replace("\xa0", " ").strip()


def _get_field(record: Dict[str, Any], *keys: str) -> Any:
    """
    Return the first non-empty value for the provided keys (case-sensitive),
    falling back to the first present value even if empty. This helps when
    column headers vary slightly across PDFs (e.g., "Start Date" vs "Start date").
    """
    for key in keys:
        val = record.get(key)
        if val not in (None, ""):
            return val
    for key in keys:
        if key in record:
            return record.get(key, "")
    return ""


def _find_header_row(rows: Sequence[Sequence[Any]]) -> tuple[int, List[str]]:
    target = "courseabbr"
    for idx, row in enumerate(rows[:120]):  # scan a generous number of rows across tables
        headers = [_clean_header(c) for c in row]
        normalized = ["".join(ch for ch in h.lower() if ch.isalnum()) for h in headers]
        if any(h == target for h in normalized):
            return idx, headers
    raise ValueError("Could not find header row containing 'Course Abbr'")


def _safe_id(term: str | None, term_id: str | None, code: str) -> str:
    base_term = (term_id or term or "term").lower()
    safe_term = "".join(ch if ch.isalnum() else "-" for ch in base_term)[:100]
    safe_code = "".join(ch if ch.isalnum() else "-" for ch in code)[:300]
    return f"{safe_term}-{safe_code}"


def _parse_rows(
    rows: Sequence[Sequence[Any]], term_label: str | None, term_id: str | None
) -> List[Dict[str, Any]]:
    detected_term = term_label or "Unknown Term"
    courses: Dict[str, Dict[str, Any]] = {}
    sections_by_course: Dict[str, list] = {}

    header_row_idx, headers = _find_header_row(rows)
    header_map = {i: h for i, h in enumerate(headers)}

    for row in rows[header_row_idx + 1 :]:
        if not any(row):
            continue
        record: Dict[str, Any] = {}
        for idx, cell in enumerate(row):
            key = header_map.get(idx, "")
            if not key:
                continue
            record[key] = cell if cell is not None else ""

        course_abbr = _normalize_code(record.get("Course Abbr"))
        section_code = str(record.get("S/T") or "").strip()
        if not course_abbr:
            continue

        title = str(record.get("Course Title") or "").strip()
        school = str(record.get("School") or "").strip()
        level = str(record.get("Level") or "").strip()
        credits_us = record.get("Cr(US)")
        credits_ects = record.get("Cr(ECTS)")

        doc_id = _safe_id(detected_term, term_id, course_abbr)
        course = courses.setdefault(
            course_abbr,
            {
                "id": doc_id,
                "course_code": course_abbr,
                "term": detected_term,
                "term_id": term_id,
                "title": title,
                "school": school,
                "level": level,
                "credits_us": credits_us,
                "credits_ects": credits_ects,
                "sections": [],
            },
        )

        if not course.get("title") and title:
            course["title"] = title
        if not course.get("school") and school:
            course["school"] = school
        if not course.get("level") and level:
            course["level"] = level
        if course.get("credits_us") is None and credits_us is not None:
            course["credits_us"] = credits_us
        if course.get("credits_ects") is None and credits_ects is not None:
            course["credits_ects"] = credits_ects

        sections_by_course.setdefault(course_abbr, []).append(
            {
                "section_code": section_code,
                "days": str(record.get("Days") or "").strip(),
                "time": str(record.get("Time") or "").strip(),
                "start_date": str(_get_field(record, "Start date", "Start Date")).strip(),
                "end_date": str(_get_field(record, "End date", "End Date")).strip(),
                "faculty": str(record.get("Faculty") or "").strip(),
                "room": str(record.get("Room") or "").strip(),
                "enrollment": record.get("Enr"),
                "capacity": record.get("Cap"),
            }
        )

    for code, course in courses.items():
        course["sections"] = sections_by_course.get(code, [])

    return list(courses.values())


def parse_schedule_pdf(pdf_bytes: bytes, term_label: str | None = None, term_id: str | None = None) -> List[Dict[str, Any]]:
    """
    Parse the registrar schedule PDF into a list of course documents with embedded sections.
    """
    rows: List[List[Any]] = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:  # type: ignore
        for page in pdf.pages:
            tables = page.extract_tables() or []
            for table in tables:
                if not table:
                    continue
                rows.extend(table)

    if not rows:
        raise ValueError("No tables found in schedule PDF")

    return _parse_rows(rows, term_label=term_label, term_id=term_id)

