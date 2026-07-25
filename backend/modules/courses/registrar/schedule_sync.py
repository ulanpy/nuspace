import asyncio
import logging
from typing import Sequence

from google.cloud import storage
from httpx import AsyncClient

from backend.modules.courses.registrar.schedule_gcs import (
    SCHEDULE_GCS_OBJECT,
    download_schedule_catalog,
    load_local_schedule_catalog_fixture,
)
from backend.modules.courses.registrar.schedule_sync_worker import (
    merge_priorities_into_schedule,
)

logger = logging.getLogger(__name__)

SCHEDULE_PDF_URL = None  # legacy; PDF parsing lives in Cloud Run Job
SCHEDULE_INDEX_UID = "course_schedule_catalog"
SCHEDULE_PRIMARY_KEY = "id"
SCHEDULE_REFRESH_INTERVAL_SECONDS = 60 * 60 * 24  # 24 hours

# Re-export for tests / callers that imported merge from this module
_merge_priorities_into_schedule = merge_priorities_into_schedule

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
    *,
    storage_client: storage.Client,
    bucket_name: str,
    gcs_object: str = SCHEDULE_GCS_OBJECT,
    prefer_local_fixture: bool = False,
) -> int:
    """
    Load pre-parsed registrar schedule JSON from GCS and upload into Meilisearch.

    PDF discovery/parsing runs in Cloud Run Job (schedule_sync_job); this path is
    lightweight I/O only so API restarts do not spike CPU.

    When prefer_local_fixture is True (local IS_DEBUG), load committed fixture first.
    """
    documents: list[dict] | None = None
    if prefer_local_fixture:
        documents = load_local_schedule_catalog_fixture()
        if documents is not None:
            logger.info("Loaded %s schedule entries from local debug fixture", len(documents))

    if documents is None:
        documents = download_schedule_catalog(
            storage_client, bucket_name, object_name=gcs_object
        )

    if documents is None:
        logger.warning(
            "Schedule catalog GCS object gs://%s/%s missing or unreadable; "
            "aborting sync to preserve existing Meilisearch data.",
            bucket_name,
            gcs_object,
        )
        return 0

    if not documents:
        logger.warning(
            "Schedule catalog GCS object gs://%s/%s is empty; "
            "aborting sync to preserve existing Meilisearch data.",
            bucket_name,
            gcs_object,
        )
        return 0

    await _recreate_schedule_index(meilisearch_client, documents)
    logger.info("Synced %s registrar schedule entries from GCS", len(documents))
    return len(documents)


class ScheduleCatalogRefresher:
    """Periodically pulls schedule catalog JSON from GCS into Meilisearch."""

    def __init__(
        self,
        meilisearch_client: AsyncClient,
        *,
        storage_client: storage.Client,
        bucket_name: str,
        gcs_object: str = SCHEDULE_GCS_OBJECT,
        interval_seconds: int = SCHEDULE_REFRESH_INTERVAL_SECONDS,
        prefer_local_fixture: bool = False,
    ):
        self._client = meilisearch_client
        self._storage_client = storage_client
        self._bucket_name = bucket_name
        self._gcs_object = gcs_object
        self._interval_seconds = interval_seconds
        self._prefer_local_fixture = prefer_local_fixture
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
                    storage_client=self._storage_client,
                    bucket_name=self._bucket_name,
                    gcs_object=self._gcs_object,
                    prefer_local_fixture=self._prefer_local_fixture,
                )
            except Exception:
                logger.exception("Failed to refresh registrar schedule data from GCS")
