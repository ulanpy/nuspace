from backend.core.configs.config import config
from backend.modules.courses.registrar.schedule_sync import sync_schedule_catalog
from backend.modules.courses.registrar.service import RegistrarService
from fastapi import FastAPI


async def setup_schedule_catalog(app: FastAPI) -> None:
    """Pull schedule catalog from GCS into Meilisearch on API startup.

    Subsequent updates arrive via Pub/Sub GCS OBJECT_FINALIZE → /api/bucket/gcs-hook
    (no periodic in-process refresher).
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


async def cleanup_schedule_catalog(app: FastAPI) -> None:
    """No background refresher to stop; hook kept for lifespan symmetry."""
    return
