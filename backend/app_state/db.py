from fastapi import FastAPI

from backend.core.database.manager import AsyncDatabaseManager, SyncDatabaseManager


async def setup_db(app: FastAPI):
    app.state.db_manager = AsyncDatabaseManager()
    app.state.db_manager_sync = SyncDatabaseManager()
    await app.state.db_manager.create_all_tables()


async def cleanup_db(app: FastAPI):
    db_manager = getattr(app.state, "db_manager", None)
    if db_manager:
        await db_manager.async_engine.dispose()
        app.state.db_manager_sync.sync_engine.dispose()
