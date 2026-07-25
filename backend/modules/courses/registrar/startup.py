from fastapi import FastAPI

from backend.core.configs.config import config
from backend.modules.courses.registrar.schedule_sync import (
    ScheduleCatalogRefresher,
    sync_schedule_catalog,
)


async def setup_schedule_catalog(app: FastAPI) -> None:
    """Pull schedule catalog from GCS into Meilisearch and start the periodic refresher."""
    storage_client = app.state.storage_client

    app.state.course_schedule_refresher = ScheduleCatalogRefresher(
        app.state.meilisearch_client,
        storage_client=storage_client,
        bucket_name=config.BUCKET_NAME,
        gcs_object=config.SCHEDULE_SYNC_GCS_OBJECT,
        prefer_local_fixture=config.IS_DEBUG,
    )
    try:
        count = await sync_schedule_catalog(
            app.state.meilisearch_client,
            storage_client=storage_client,
            bucket_name=config.BUCKET_NAME,
            gcs_object=config.SCHEDULE_SYNC_GCS_OBJECT,
            prefer_local_fixture=config.IS_DEBUG,
        )
        source = "local fixture" if config.IS_DEBUG else "GCS"
        print(f"Synced schedule catalog docs from {source}: {count}")
    except Exception as exc:
        print(f"Error syncing registrar course schedule from GCS: {exc}")
    app.state.course_schedule_refresher.start()


async def cleanup_schedule_catalog(app: FastAPI) -> None:
    schedule_refresher = getattr(app.state, "course_schedule_refresher", None)
    if schedule_refresher:
        await schedule_refresher.stop()
