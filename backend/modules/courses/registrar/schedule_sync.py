import asyncio
import json
import logging
import os
import re
import sys
import tempfile
from pathlib import Path
from typing import Sequence

import httpx
from httpx import AsyncClient

from backend.modules.courses.registrar.parsers.schedule_pdf_parser import parse_schedule_pdf
from backend.modules.courses.registrar.parsers.priority_parser import parse_pdf as parse_priority_pdf

logger = logging.getLogger(__name__)

SCHEDULE_PDF_URL = None  # auto-discover when None
SCHEDULE_INDEX_UID = "course_schedule_catalog"
SCHEDULE_PRIMARY_KEY = "id"
SCHEDULE_REFRESH_INTERVAL_SECONDS = 60 * 60  # 1 hour

SCHEDULE_SEARCHABLE_ATTRIBUTES: Sequence[str] = (
    "course_code",
    "title",
    "school",
    "level",
    "sections.section_code",
    "sections.faculty",
)
SCHEDULE_FILTERABLE_ATTRIBUTES: Sequence[str] = ("term", "term_id", "school", "level")


async def _recreate_schedule_index(
    meilisearch_client: AsyncClient, documents: Sequence[dict]
) -> None:
    delete_response = await meilisearch_client.delete(f"/indexes/{SCHEDULE_INDEX_UID}")
    if delete_response.status_code not in (200, 202, 204, 404):
        delete_response.raise_for_status()

    create_response = await meilisearch_client.post(
        "/indexes", json={"uid": SCHEDULE_INDEX_UID, "primaryKey": SCHEDULE_PRIMARY_KEY}
    )
    create_response.raise_for_status()

    if documents:
        upload_response = await meilisearch_client.post(
            f"/indexes/{SCHEDULE_INDEX_UID}/documents", json=documents
        )
        upload_response.raise_for_status()

    settings_payload = {
        "searchableAttributes": list(SCHEDULE_SEARCHABLE_ATTRIBUTES),
        "filterableAttributes": list(SCHEDULE_FILTERABLE_ATTRIBUTES),
    }
    settings_response = await meilisearch_client.patch(
        f"/indexes/{SCHEDULE_INDEX_UID}/settings",
        json=settings_payload,
    )
    settings_response.raise_for_status()


async def sync_schedule_catalog(
    meilisearch_client: AsyncClient,
    pdf_url: str | None = SCHEDULE_PDF_URL,
    term_label: str | None = None,
    priority_pdf_url: str | None = None,
) -> int:
    """
    Download, parse, and upload registrar schedule PDF into Meilisearch.
    Also merges registrar priority metadata into the same index to avoid
    cross-index lookups at runtime.
    Uses a subprocess parser for the schedule PDF to avoid blocking the API process.
    """
    latest = None
    if pdf_url is None or term_label is None or priority_pdf_url is None:
        try:
            latest = await _discover_latest_term()
        except Exception:
            logger.exception("Failed to auto-discover latest term; falling back to defaults if provided")

    if pdf_url is None and latest:
        pdf_url = (
            "https://registrar.nu.edu.kz/registrar_downloads/json?method=printDocument"
            f"&name=school_schedule_by_term&termid={latest['termid']}"
        )
    if term_label is None and latest:
        term_label = latest["label"]
    if priority_pdf_url is None and latest:
        priority_pdf_url = (
            "https://registrar.nu.edu.kz/registrar_downloads/json?method=printDocument"
            f"&name=course_requirements&termid={latest['termid']}"
        )

    documents = await _run_schedule_parser_subprocess(pdf_url, term_label)

    if priority_pdf_url:
        try:
            # Priority PDF sometimes has cert issues; allow insecure fetch to avoid blocking sync.
            async with httpx.AsyncClient(verify=False, timeout=30) as client:
                resp = await client.get(priority_pdf_url)
                resp.raise_for_status()
                priority_docs = parse_priority_pdf(resp.content)
        except Exception:
            logger.exception(
                "Failed to fetch/parse priority PDF (SSL verify disabled for this fetch); continuing without priorities"
            )
            priority_docs = []

        if priority_docs:
            merged = _merge_priorities_into_schedule(documents, priority_docs)
            documents = merged

    await _recreate_schedule_index(meilisearch_client, documents)
    logger.info("Synced %s registrar schedule entries", len(documents))
    return len(documents)


async def _run_schedule_parser_subprocess(pdf_url: str, term_label: str | None) -> Sequence[dict]:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".json") as tmp:
        output_path = Path(tmp.name)

    env = os.environ.copy()
    env["SCHEDULE_SYNC__PDF_URL"] = pdf_url
    env["SCHEDULE_SYNC__OUTPUT_PATH"] = str(output_path)
    if term_label:
        env["SCHEDULE_SYNC__TERM_LABEL"] = term_label
    # Also pass term id if present in URL
    try:
        from urllib.parse import parse_qs, urlparse

        qs = parse_qs(urlparse(pdf_url).query)
        term_id = qs.get("termid", [None])[0]
        if term_id:
            env["SCHEDULE_SYNC__TERM_ID"] = term_id
    except Exception:
        pass

    process = await asyncio.create_subprocess_exec(
        sys.executable,
        "-m",
        "backend.modules.courses.registrar.schedule_sync_worker",
        env=env,
    )
    await process.wait()

    if process.returncode != 0:
        output_path.unlink(missing_ok=True)
        raise RuntimeError(f"Schedule sync worker exited with code {process.returncode}")

    try:
        with output_path.open("r", encoding="utf-8") as fp:
            data = json.load(fp)
    finally:
        output_path.unlink(missing_ok=True)

    return data


_TERM_PATTERN = re.compile(
    r"(?P<label>(Spring|Fall)\s+(?P<year>\d{4})).*?termid=(?P<termid>\d+)",
    re.IGNORECASE | re.DOTALL,
)
_SEASON_ORDER = {"Spring": 1, "Summer": 2, "Fall": 3, "Winter": 0}
_DISCOVERY_PAGES = [
    "https://registrar.nu.edu.kz/course-schedules",
    "https://registrar.nu.edu.kz/course-requirements",
]


async def _discover_latest_term() -> dict:
    """Scrape registrar pages to find the latest term label + termid."""
    async with httpx.AsyncClient(verify=False, timeout=30) as client:
        texts = []
        for url in _DISCOVERY_PAGES:
            resp = await client.get(url)
            resp.raise_for_status()
            texts.append(resp.text)

    candidates: list[dict] = []
    for text in texts:
        for m in _TERM_PATTERN.finditer(text):
            label = m.group("label").strip()
            season = label.split()[0].capitalize()
            year = int(m.group("year"))
            termid = m.group("termid")
            candidates.append(
                {
                    "label": label,
                    "season": season,
                    "year": year,
                    "termid": termid,
                }
            )

    if not candidates:
        raise RuntimeError("No term entries found during discovery")

    def sort_key(item: dict):
        return (item["year"], _SEASON_ORDER.get(item["season"], 0))

    latest = max(candidates, key=sort_key)
    return latest


def _normalize_code(value: str | None) -> str:
    if not value:
        return ""
    return (
        value.replace("-", "")
        .replace(" ", "")
        .strip()
        .upper()
    )


def _merge_priorities_into_schedule(
    schedule_docs: Sequence[dict], priority_docs: Sequence[dict]
) -> Sequence[dict]:
    priority_map = {
        _normalize_code(item.get("abbr")): item
        for item in priority_docs
        if _normalize_code(item.get("abbr"))
    }

    merged = []
    for doc in schedule_docs:
        code = _normalize_code(doc.get("course_code"))
        priority = priority_map.get(code)
        if priority:
            doc = {
                **doc,
                "prerequisite": priority.get("prerequisite") or "",
                "corequisite": priority.get("corequisite") or "",
                "antirequisite": priority.get("antirequisite") or "",
                "priority_1": priority.get("priority_1") or None,
                "priority_2": priority.get("priority_2") or None,
                "priority_3": priority.get("priority_3") or None,
                "priority_4": priority.get("priority_4") or None,
            }
        merged.append(doc)

    return merged


class ScheduleCatalogRefresher:
    """Schedules periodic refresh of registrar schedule PDF data."""

    def __init__(
        self,
        meilisearch_client: AsyncClient,
        *,
        pdf_url: str = SCHEDULE_PDF_URL,
        term_label: str | None = None,
        interval_seconds: int = SCHEDULE_REFRESH_INTERVAL_SECONDS,
    ):
        self._client = meilisearch_client
        self._pdf_url = pdf_url
        self._term_label = term_label
        self._interval_seconds = interval_seconds
        self._stop_event: asyncio.Event | None = None
        self._task: asyncio.Task | None = None

    def start(self) -> None:
        if self._task:
            return
        self._stop_event = asyncio.Event()
        self._task = asyncio.create_task(self._run(), name="schedule-catalog-refresh")

    async def stop(self) -> None:
        if not self._task or not self._stop_event:
            return
        self._stop_event.set()
        try:
            await self._task
        finally:
            self._task = None
            self._stop_event = None

    async def _run(self) -> None:
        assert self._stop_event is not None
        while not self._stop_event.is_set():
            try:
                await asyncio.wait_for(self._stop_event.wait(), timeout=self._interval_seconds)
            except asyncio.TimeoutError:
                pass

            if self._stop_event.is_set():
                break

            try:
                await sync_schedule_catalog(
                    self._client,
                    pdf_url=self._pdf_url,
                    term_label=self._term_label,
                )
            except Exception:
                logger.exception("Failed to refresh registrar schedule data")


