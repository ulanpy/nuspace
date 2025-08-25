from fastapi import FastAPI

from backend.core.configs.config import config
from backend.core.database.manager import AsyncDatabaseManager


async def setup_db(app: FastAPI):
    app.state.db_manager = AsyncDatabaseManager()
    # Avoid implicit schema creation in production – rely on Alembic migrations instead
    if config.IS_DEBUG:
        await app.state.db_manager.create_all_tables()


async def cleanup_db(app: FastAPI):
    db_manager = getattr(app.state, "db_manager", None)
    if db_manager:
        await db_manager.async_engine.dispose()
