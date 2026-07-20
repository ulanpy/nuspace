from fastapi import FastAPI

from backend.modules.courses.registrar.schedule_sync import (
    ScheduleCatalogRefresher,
    sync_schedule_catalog,
)


async def setup_schedule_catalog(app: FastAPI) -> None:
    """Sync registrar schedule index and start the periodic refresher."""
    app.state.course_schedule_refresher = ScheduleCatalogRefresher(
        app.state.meilisearch_client
    )
    try:
        count = await sync_schedule_catalog(app.state.meilisearch_client)
        print(f"Synced schedule catalog docs (with priorities): {count}")
    except Exception as exc:
        print(f"Error syncing registrar course schedule: {exc}")
    app.state.course_schedule_refresher.start()


async def cleanup_schedule_catalog(app: FastAPI) -> None:
    schedule_refresher = getattr(app.state, "course_schedule_refresher", None)
    if schedule_refresher:
        await schedule_refresher.stop()
