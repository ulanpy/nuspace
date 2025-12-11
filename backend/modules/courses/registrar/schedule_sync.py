import asyncio
import json
import logging
import os
import sys
import tempfile
from pathlib import Path
from typing import Sequence

import httpx
from httpx import AsyncClient

from backend.modules.courses.registrar.parsers.schedule_pdf_parser import parse_schedule_pdf

logger = logging.getLogger(__name__)

SCHEDULE_PDF_URL = (
    "https://registrar.nu.edu.kz/registrar_downloads/json?method=printDocument"
    "&name=school_schedule_by_term&termid=823"
)
# Default term label if not provided; update if term changes.
SCHEDULE_TERM_LABEL_DEFAULT = "Spring 2026"
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
SCHEDULE_FILTERABLE_ATTRIBUTES: Sequence[str] = ("term", "school", "level")


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
    pdf_url: str = SCHEDULE_PDF_URL,
    term_label: str | None = None,
) -> int:
    """
    Download, parse, and upload registrar schedule PDF into Meilisearch in-process.
    (Subprocess path removed to avoid host/env mismatches.)
    """
    try:
        async with httpx.AsyncClient(verify=False, timeout=60.0) as client:
            resp = await client.get(pdf_url)
            resp.raise_for_status()
            term_id = None
            try:
                from urllib.parse import parse_qs, urlparse

                qs = parse_qs(urlparse(pdf_url).query)
                term_id = qs.get("termid", [None])[0]
            except Exception:
                term_id = None
            effective_term_label = term_label or SCHEDULE_TERM_LABEL_DEFAULT
            documents = parse_schedule_pdf(
                resp.content, term_label=effective_term_label, term_id=term_id
            )
    except Exception as exc:  # pragma: no cover - network/parsing failures
        logger.exception("Schedule sync failed: %s", exc)
        raise

    await _recreate_schedule_index(meilisearch_client, documents)
    logger.info("Synced %s registrar schedule entries", len(documents))
    return len(documents)


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


