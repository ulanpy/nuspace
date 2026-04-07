"""
Fetch registrar ``school_schedule_by_term`` PDF and write CSV for ``run_pipeline.load_schedule``.
"""

from __future__ import annotations

import csv
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import httpx
from backend.modules.courses.registrar.parsers.schedule_pdf_parser import parse_schedule_pdf

TERM_PATTERN = re.compile(
    r"(?P<label>(Spring|Summer|Fall)\s+(?P<year>\d{4})).*?termid=(?P<termid>\d+)",
    re.IGNORECASE | re.DOTALL,
)
REGISTRAR_DISCOVERY_PAGES = [
    "https://registrar.nu.edu.kz/course-schedules",
    "https://registrar.nu.edu.kz/course-requirements",
]

_TIMEOUT_REGISTRAR = httpx.Timeout(connect=45.0, read=180.0, write=60.0, pool=30.0)
_TIMEOUT_SCHEDULE_PDF = httpx.Timeout(connect=45.0, read=600.0, write=120.0, pool=30.0)
_RETRIES = 4

_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    ),
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
}


def _get_with_retries(
    url: str,
    *,
    verify: bool,
    timeout: httpx.Timeout,
    attempts: int = _RETRIES,
) -> httpx.Response:
    last: Exception | None = None
    for attempt in range(attempts):
        try:
            with httpx.Client(
                verify=verify,
                timeout=timeout,
                follow_redirects=True,
                headers=_BROWSER_HEADERS,
            ) as client:
                r = client.get(url)
                r.raise_for_status()
                return r
        except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.ConnectError, httpx.RemoteProtocolError) as e:
            last = e
            if attempt + 1 < attempts:
                time.sleep(min(10.0, 2.0**attempt))
    assert last is not None
    raise last


def term_code_to_registrar_label(term_code: str) -> str:
    t = term_code.strip().upper()
    m = re.fullmatch(r"(FA|SP|SU)(\d{4})", t)
    if not m:
        raise ValueError(
            f"Invalid term code {term_code!r}; expected FA####, SP#### or SU####"
        )
    
    code = m.group(1)
    if code == "FA":
        season = "Fall"
    elif code == "SP":
        season = "Spring"
    else:
        season = "Summer"
        
    return f"{season} {m.group(2)}"


def _discover_registrar_terms() -> list[dict]:
    candidates: list[dict] = []
    for url in REGISTRAR_DISCOVERY_PAGES:
        resp = _get_with_retries(url, verify=False, timeout=_TIMEOUT_REGISTRAR)
        for m in TERM_PATTERN.finditer(resp.text):
            label = m.group("label").strip()
            season = label.split()[0].capitalize()
            year = int(m.group("year"))
            termid = m.group("termid")
            candidates.append(
                {"label": label, "season": season, "year": year, "termid": termid}
            )
    if not candidates:
        raise RuntimeError("No registrar term entries found on discovery pages")
    seen: dict[str, dict] = {}
    for c in candidates:
        tid = c["termid"]
        if tid not in seen:
            seen[tid] = c
    return list(seen.values())


def resolve_registrar_term_id(registrar_label: str) -> str:
    want = registrar_label.strip().lower()
    all_terms = _discover_registrar_terms()
    for c in all_terms:
        if c["label"].strip().lower() == want:
            return c["termid"]
    available = sorted({c["label"] for c in all_terms})
    raise RuntimeError(
        f"No registrar termid for {registrar_label!r}. Available: {available[:25]}..."
    )


def registrar_schedule_pdf_url(term_id: str) -> str:
    return (
        "https://registrar.nu.edu.kz/registrar_downloads/json?method=printDocument"
        f"&name=school_schedule_by_term&termid={term_id}"
    )


def _schedule_documents_to_csv_rows(documents: Iterable[dict]) -> list[list]:
    rows: list[list] = []
    for doc in documents:
        code = (doc.get("course_code") or "").strip()
        title = (doc.get("title") or "").strip()
        school = (doc.get("school") or "").strip()
        level = (doc.get("level") or "").strip()
        cr_us = doc.get("credits_us")
        cr_ects = doc.get("credits_ects")
        cr_us_s = "" if cr_us is None else str(cr_us).strip()
        cr_ects_s = "" if cr_ects is None else str(cr_ects).strip()
        for sec in doc.get("sections") or []:
            rows.append(
                [
                    school,
                    level,
                    code,
                    str(sec.get("section_code") or "").strip(),
                    title,
                    cr_us_s,
                    cr_ects_s,
                    str(sec.get("start_date") or "").strip(),
                    str(sec.get("end_date") or "").strip(),
                    str(sec.get("days") or "").strip(),
                    str(sec.get("time") or "").strip(),
                    str(sec.get("enrollment") if sec.get("enrollment") is not None else "").strip(),
                    str(sec.get("capacity") if sec.get("capacity") is not None else "").strip(),
                    str(sec.get("faculty") or "").strip(),
                    str(sec.get("room") or "").strip(),
                ]
            )
    return rows


def write_schedule_csv_for_pipeline(
    path: Path,
    *,
    registrar_label: str,
    documents: list[dict],
) -> None:
    header = [
        "School",
        "Level",
        "Course Abbr",
        "S/T",
        "Course Title",
        "Cr(US)",
        "Cr(ECTS)",
        "Start date",
        "End date",
        "Days",
        "Time",
        "Enr",
        "Cap",
        "Faculty",
        "Room",
    ]
    ncols = len(header)
    path.parent.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    data_rows = _schedule_documents_to_csv_rows(documents)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow([registrar_label] + [""] * (ncols - 1))
        w.writerow([now] + [""] * (ncols - 1))
        w.writerow(header)
        w.writerows(data_rows)


def fetch_registrar_schedule_csv(registrar_label: str, dest_csv: Path) -> None:
    """Download school_schedule_by_term PDF from registrar and write CSV for the pipeline."""
    term_id = resolve_registrar_term_id(registrar_label)
    url = registrar_schedule_pdf_url(term_id)
    r = _get_with_retries(url, verify=False, timeout=_TIMEOUT_SCHEDULE_PDF)
    docs = parse_schedule_pdf(r.content, term_label=registrar_label, term_id=term_id)
    if not docs:
        raise RuntimeError("Registrar schedule PDF parsed to zero courses.")
    write_schedule_csv_for_pipeline(dest_csv, registrar_label=registrar_label, documents=docs)
