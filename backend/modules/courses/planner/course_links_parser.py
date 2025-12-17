from __future__ import annotations

import argparse
import logging
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin

import requests


LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True)
class CourseLink:
    course_code: str
    course_name: str
    link: str


def _normalize_whitespace(text: str) -> str:
    return " ".join((text or "").split())


def _parse_course_text(text: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Try to split a link's text into course code + course name.
    Accepts formats like:
      - 'ECON 101 Principles of Microeconomics'
      - 'ECON 101 - Principles of Microeconomics'
      - 'ECON101 Principles of Microeconomics'
    """
    cleaned = _normalize_whitespace(text)
    m = re.match(r"^([A-Za-z]{2,}\s*\d{3}[A-Za-z]?)\s*-?\s*(.*)$", cleaned)
    if not m:
        return None, None
    code = _normalize_whitespace(m.group(1)).upper()
    name = _normalize_whitespace(m.group(2))
    return code, name or None


def _extract_from_search_json(data) -> List[Dict[str, str]]:
    """Extract raw row dicts from various JSON response shapes."""
    if isinstance(data, list):
        return [row for row in data if isinstance(row, dict)]
    if isinstance(data, dict):
        for key in ("data", "rows", "items", "results"):
            if isinstance(data.get(key), list):
                return [row for row in data[key] if isinstance(row, dict)]
    return []


def _build_report_link(report_base: str, entity_id: Optional[str]) -> Optional[str]:
    if not entity_id:
        return None
    # Replace trailing ID in path if present; otherwise append as query.
    m = re.match(r"^(https?://[^/]+/DynamicReports/AllFieldsReportByEntity/)(\d+)(/?.*)$", report_base)
    if m:
        return f"{m.group(1)}{entity_id}{m.group(3)}"
    sep = "&" if "?" in report_base else "?"
    return f"{report_base}{sep}id={entity_id}"


def _extract_links_from_search_json(data, report_base: str) -> List[CourseLink]:
    rows = _extract_from_search_json(data)
    found: List[CourseLink] = []
    for row in rows:
        subj = row.get("SubjectCode")
        num = row.get("CourseNumber")
        code = (
            row.get("course_code")
            or row.get("CourseCode")
            or row.get("Code")
            or row.get("TitleCode")
            or row.get("title")
            or row.get("Title")
        )
        name = (
            row.get("course_name")
            or row.get("CourseName")
            or row.get("Title")
            or row.get("title")
            or ""
        )
        if subj and num:
            code = f"{subj} {num}"
        entity_id = (
            row.get("EntityId")
            or row.get("entityId")
            or row.get("CourseId")
            or row.get("Id")
            or row.get("id")
        )
        meta_reports = row.get("MetaReports") or []
        report_href: Optional[str] = None
        for meta in meta_reports:
            # Prefer the student report (422) if present, else first with Url.
            if not isinstance(meta, dict):
                continue
            url_str = meta.get("Url")
            if not url_str:
                continue
            if meta.get("Id") == 422 or report_href is None:
                m = re.search(r'href="([^"]+)"', str(url_str))
                if m:
                    report_href = m.group(1).replace("&amp;", "&")
                    if meta.get("Id") == 422:
                        break
        if not code:
            continue
        code_norm, name_norm = _parse_course_text(str(code) + (" " + str(name) if name else ""))
        link = None
        if report_href:
            link = urljoin(report_base, report_href)
        if not link:
            link = _build_report_link(report_base, str(entity_id) if entity_id is not None else None)
        found.append(
            CourseLink(
                course_code=code_norm or str(code).strip().upper(),
                course_name=name_norm or str(name),
                link=link or report_base,
            )
        )
    return found


def _search_payload(page: int, page_size: int) -> Dict[str, str]:
    return {
        "options[pagesize]": str(page_size),
        "options[page]": str(page),
        "options[titleFilter]": "",
        "options[entityTypeId]": "1",
        "options[filterScope]": "0",
        "options[sortDirection]": "1",
        "options[clientEntityTypeId]": "1",
        "options[clientEntitySubTypeId]": "",
        "options[filters][sql]": "field-status-1 = 1",
        "options[filterByUser]": "0",
        "options[DisplayColumns][0][id]": "field-check-field-872-3",
        "options[DisplayColumns][0][location]": "1",
        "options[DisplayColumns][1][id]": "field-check-field-873-1",
        "options[DisplayColumns][1][location]": "1",
        "options[DisplayColumns][2][id]": "field-check-field-888-2",
        "options[DisplayColumns][2][location]": "1",
        "options[DisplayColumns][3][id]": "field-check-field-ProposalType-1",
        "options[DisplayColumns][3][location]": "1",
        "options[DisplayColumns][4][id]": "field-check-field-status-1",
        "options[DisplayColumns][4][location]": "1",
    }


def scrape_course_links(
    *,
    report_base_url: str,
    search_url: str,
    session: Optional[requests.Session] = None,
    max_pages: int = 200,
    page_size: int = 50,
    debug_dump: Optional[Path] = None,
) -> List[CourseLink]:
    """
    Crawl the course search endpoint and collect course_code/name/link rows.
    """
    sess = session or requests.Session()
    page = 0
    all_links: List[CourseLink] = []
    seen: set[Tuple[str, str]] = set()

    while page < max_pages:
        payload = _search_payload(page=page, page_size=page_size)
        resp = sess.post(search_url, data=payload, timeout=30)
        if resp.status_code >= 400:
            LOGGER.warning("Stopping at page %s due to HTTP %s", page, resp.status_code)
            if page == 0 and debug_dump:
                debug_dump.write_text(resp.text, encoding="utf-8")
            break

        if page == 0 and debug_dump:
            debug_dump.write_text(resp.text, encoding="utf-8")
            LOGGER.info("Saved first page payload to %s for debugging", debug_dump)

        try:
            data = resp.json()
        except Exception:
            LOGGER.warning("Failed to parse JSON on page %s", page)
            break

        page_links = _extract_links_from_search_json(data, report_base_url)
        if not page_links:
            break

        fresh = 0
        for link in page_links:
            key = (link.course_code, link.link)
            if key in seen:
                continue
            seen.add(key)
            all_links.append(link)
            fresh += 1

        if fresh == 0:
            break
        page += 1

    return all_links


def _build_session_with_cookie(cookie: Optional[str]) -> requests.Session:
    sess = requests.Session()
    if cookie:
        sess.headers.update({"Cookie": cookie})
    return sess


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape course links into CSV.")
    parser.add_argument(
        "--report-url",
        required=True,
        help="Base report URL (e.g., https://nukz.curriqunet.com/DynamicReports/AllFieldsReportByEntity/351?entityType=Course&reportId=422)",
    )
    parser.add_argument(
        "--search-url",
        default="https://nukz.curriqunet.com/Search/NewSearch",
        help="Course search endpoint (POST, paginated)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("frontend/public/data/course_links.csv"),
        help="Path to write CSV output",
    )
    parser.add_argument(
        "--cookie",
        default=None,
        help="Optional Cookie header value for authenticated access",
    )
    parser.add_argument(
        "--user-agent",
        default="Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/117.0",
        help="User-Agent header to send with requests",
    )
    parser.add_argument(
        "--referer",
        default="https://nukz.curriqunet.com/",
        help="Referer header to send with requests (defaults to site root)",
    )
    parser.add_argument(
        "--header",
        action="append",
        default=[],
        help="Additional header in 'Key: Value' form (can be repeated)",
    )
    parser.add_argument(
        "--debug-dump",
        type=Path,
        default=None,
        help="If set, write the first page JSON to this path for debugging auth/empty results",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=200,
        help="Pagination limit (default: 200)",
    )
    parser.add_argument(
        "--page-size",
        type=int,
        default=50,
        help="Search page size (default: 50)",
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)
    # Late import to keep the script runnable standalone without importing backend/__init__.
    try:
        from backend.modules.courses.planner.course_links_store import write_links_csv  # type: ignore
    except Exception:
        store_path = Path(__file__).resolve().parent / "course_links_store.py"
        spec = __import__("importlib.util").util.spec_from_file_location("course_links_store_local", store_path)
        if not spec or not spec.loader:  # pragma: no cover - defensive
            raise
        module = __import__("importlib.util").util.module_from_spec(spec)
        sys.modules["course_links_store_local"] = module
        spec.loader.exec_module(module)
        write_links_csv = module.write_links_csv  # type: ignore

    extra_headers: Dict[str, str] = {}
    for raw in args.header or []:
        if not raw or ":" not in raw:
            continue
        key, value = raw.split(":", 1)
        extra_headers[key.strip()] = value.strip()

    session = _build_session_with_cookie(args.cookie)
    session.headers.update(
        {
            "User-Agent": args.user_agent,
            "Referer": args.referer,
            **extra_headers,
        }
    )
    links = scrape_course_links(
        report_base_url=args.report_url,
        search_url=args.search_url,
        session=session,
        max_pages=args.max_pages,
        page_size=args.page_size,
        debug_dump=args.debug_dump,
    )
    count = write_links_csv(args.output, links)
    LOGGER.info("Wrote %s course links to %s", count, args.output)


if __name__ == "__main__":
    main()
