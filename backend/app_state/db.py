from fastapi import FastAPI

from backend.core.configs.config import config as app_config
from backend.core.database.manager import AsyncDatabaseManager
from alembic.config import Config
from alembic import command

async def setup_db(app: FastAPI):
    app.state.db_manager = AsyncDatabaseManager()
    if app_config.IS_DEBUG:
        config = Config("backend/alembic.ini")
        command.upgrade(config, "head")


async def cleanup_db(app: FastAPI):
    db_manager = getattr(app.state, "db_manager", None)
    if db_manager:
        await db_manager.async_engine.dispose()
