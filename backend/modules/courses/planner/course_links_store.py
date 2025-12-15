from __future__ import annotations

import csv
import importlib.util
import sys
from pathlib import Path
from typing import Iterable, List


def _load_course_link_class():
    try:
        from backend.modules.courses.planner.course_links_parser import CourseLink  # type: ignore
        return CourseLink
    except Exception:
        # Fallback when running as a standalone script (avoid importing backend/__init__.py).
        parser_path = Path(__file__).resolve().parent / "course_links_parser.py"
        spec = importlib.util.spec_from_file_location("course_links_parser_local", parser_path)
        if not spec or not spec.loader:  # pragma: no cover - defensive
            raise
        module = importlib.util.module_from_spec(spec)
        sys.modules["course_links_parser_local"] = module
        spec.loader.exec_module(module)
        return module.CourseLink  # type: ignore


CourseLink = _load_course_link_class()


DEFAULT_LINKS_CSV = Path("data/course_links.csv")


def write_links_csv(path: Path, links: Iterable[CourseLink]) -> int:
    """Persist parsed course links to a CSV file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = list(links)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["course_code", "course_name", "link"])
        writer.writeheader()
        for row in rows:
            writer.writerow(
                {
                    "course_code": row.course_code,
                    "course_name": row.course_name,
                    "link": row.link,
                }
            )
    return len(rows)


def read_links_csv(path: Path = DEFAULT_LINKS_CSV) -> List[CourseLink]:
    """Load course links from CSV for later ingestion into the DB."""
    if not path.exists():
        return []
    results: List[CourseLink] = []
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if not row:
                continue
            code = (row.get("course_code") or "").strip()
            name = (row.get("course_name") or "").strip()
            link = (row.get("link") or "").strip()
            if code and link:
                results.append(CourseLink(course_code=code, course_name=name, link=link))
    return results
