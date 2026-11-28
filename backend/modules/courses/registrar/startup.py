import os

from backend.core.configs.config import config
from backend.modules.courses.registrar.schedule_sync import sync_schedule_catalog
from backend.modules.courses.registrar.service import RegistrarService
from fastapi import FastAPI
from google.cloud import storage
from httpx import AsyncClient


async def setup_schedule_catalog(app: FastAPI) -> None:
    """Load the active registrar semester on API startup.

    The catalog itself lives in Meilisearch and is not touched here: it is filled
    by the explicit rebuild (``rebuild_schedule_catalog``) and kept current by
    Pub/Sub GCS OBJECT_FINALIZE → /api/bucket/gcs-hook (no periodic in-process
    refresher).
    """
    storage_client = app.state.storage_client

    registrar = RegistrarService(
        storage_client=storage_client,
        bucket_name=app.state.config.BUCKET_NAME,
    )
    app.state.active_registrar_semester = await registrar.load_active_semester(
        prefer_local_fixture=app.state.config.IS_DEBUG,
    )
    if app.state.active_registrar_semester is None:
        print("Active registrar semester metadata is unavailable")


async def rebuild_schedule_catalog(meilisearch_client: AsyncClient) -> int:
    """Replace the schedule catalog index with the catalog stored in GCS.

    Returns the number of documents indexed; 0 means the catalog was missing or
    empty and the index was left as it was.
    """
    if config.USE_GCS_EMULATOR:
        os.environ["STORAGE_EMULATOR_HOST"] = config.GCS_EMULATOR_HOST
        storage_client = storage.Client(project="dev")
    else:
        storage_client = storage.Client(project=config.GCP_PROJECT_ID)

    return await sync_schedule_catalog(
        meilisearch_client,
        storage_client=storage_client,
        bucket_name=config.BUCKET_NAME,
        gcs_object=config.SCHEDULE_SYNC_GCS_OBJECT,
        prefer_local_fixture=config.IS_DEBUG,
    )


async def cleanup_schedule_catalog(app: FastAPI) -> None:
    """No background refresher to stop; hook kept for lifespan symmetry."""
    return
