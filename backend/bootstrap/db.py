from fastapi import FastAPI

from backend.core.database.manager import AsyncDatabaseManager


async def setup_db(app: FastAPI):
    app.state.db_manager = AsyncDatabaseManager()
    # Run migrations explicitly when schema changes are ready to apply.
    # command.upgrade(Config(_ALEMBIC_INI), "head")


async def cleanup_db(app: FastAPI):
    db_manager = getattr(app.state, "db_manager", None)
    if db_manager:
        await db_manager.async_engine.dispose()
