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

logger = logging.getLogger(__name__)

PRIORITY_PDF_URL = (
    "https://registrar.nu.edu.kz/registrar_downloads/json?method=printDocument"
    "&name=course_requirements&termid=823"
)
PRIORITY_INDEX_UID = "course_priorities"
PRIORITY_PRIMARY_KEY = "id"
PRIORITY_REFRESH_INTERVAL_SECONDS = 30 * 60  # 30 minutes
PRIORITY_SEARCHABLE_ATTRIBUTES: Sequence[str] = (
    "abbr",
    "title",
    "prerequisite",
    "corequisite",
    "antirequisite",
    "priority_1",
    "priority_2",
    "priority_3",
    "priority_4",
)
PRIORITY_FILTERABLE_ATTRIBUTES: Sequence[str] = (
    "abbr",
    "priority_1",
    "priority_2",
    "priority_3",
    "priority_4",
)


async def _download_priority_pdf(url: str = PRIORITY_PDF_URL, timeout: float = 60.0) -> bytes:
    # Registrar endpoint serves a self-signed cert in some envs, so skip verification.
    async with httpx.AsyncClient(timeout=timeout, verify=False) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.content


async def _recreate_priority_index(
    meilisearch_client: AsyncClient, documents: Sequence[dict]
) -> None:
    delete_response = await meilisearch_client.delete(f"/indexes/{PRIORITY_INDEX_UID}")
    if delete_response.status_code not in (200, 202, 204, 404):
        delete_response.raise_for_status()

    create_response = await meilisearch_client.post(
        "/indexes", json={"uid": PRIORITY_INDEX_UID, "primaryKey": PRIORITY_PRIMARY_KEY}
    )
    create_response.raise_for_status()

    if documents:
        upload_response = await meilisearch_client.post(
            f"/indexes/{PRIORITY_INDEX_UID}/documents", json=documents
        )
        upload_response.raise_for_status()

    settings_payload = {
        "searchableAttributes": list(PRIORITY_SEARCHABLE_ATTRIBUTES),
        "filterableAttributes": list(PRIORITY_FILTERABLE_ATTRIBUTES),
    }
    settings_response = await meilisearch_client.patch(
        f"/indexes/{PRIORITY_INDEX_UID}/settings",
        json=settings_payload,
    )
    settings_response.raise_for_status()


async def sync_priority_requirements(
    meilisearch_client: AsyncClient, pdf_url: str = PRIORITY_PDF_URL
) -> int:
    """Download, parse, and upload registrar priorities into Meilisearch."""
    documents = await _run_priority_parser_subprocess(pdf_url)
    await _recreate_priority_index(meilisearch_client, documents)
    logger.info("Synced %s registrar course priority entries", len(documents))
    return len(documents)


async def _run_priority_parser_subprocess(pdf_url: str) -> Sequence[dict]:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".json") as tmp:
        output_path = Path(tmp.name)

    env = os.environ.copy()
    env["PRIORITY_SYNC__PDF_URL"] = pdf_url
    env["PRIORITY_SYNC__OUTPUT_PATH"] = str(output_path)

    process = await asyncio.create_subprocess_exec(
        sys.executable,
        "-m",
        "backend.modules.courses.registrar.priority_sync_worker",
        env=env,
    )
    await process.wait()

    if process.returncode != 0:
        output_path.unlink(missing_ok=True)
        raise RuntimeError(f"Priority sync worker exited with code {process.returncode}")

    try:
        with output_path.open("r", encoding="utf-8") as fp:
            data = json.load(fp)
    finally:
        output_path.unlink(missing_ok=True)

    return data


class PriorityRequirementsRefresher:
    """Schedules periodic refresh of registrar priority data."""

    def __init__(
        self,
        meilisearch_client: AsyncClient,
        *,
        pdf_url: str = PRIORITY_PDF_URL,
        interval_seconds: int = PRIORITY_REFRESH_INTERVAL_SECONDS,
    ):
        self._client = meilisearch_client
        self._pdf_url = pdf_url
        self._interval_seconds = interval_seconds
        self._stop_event: asyncio.Event | None = None
        self._task: asyncio.Task | None = None

    def start(self) -> None:
        if self._task:
            return
        self._stop_event = asyncio.Event()
        self._task = asyncio.create_task(self._run(), name="priority-requirements-refresh")

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
                await asyncio.wait_for(
                    self._stop_event.wait(), timeout=self._interval_seconds
                )
            except asyncio.TimeoutError:
                pass

            if self._stop_event.is_set():
                break

            try:
                await sync_priority_requirements(self._client, self._pdf_url)
            except Exception:
                logger.exception("Failed to refresh registrar priority data")

