import os

from fastapi import FastAPI
from alembic import command
from alembic.config import Config

from backend.core.configs.config import config as app_config
from backend.core.database.manager import AsyncDatabaseManager

_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_ALEMBIC_INI = os.path.join(_BACKEND_DIR, "alembic.ini")


async def setup_db(app: FastAPI):
    app.state.db_manager = AsyncDatabaseManager()
    if app_config.IS_DEBUG:
        config = Config(_ALEMBIC_INI)
        command.upgrade(config, "head")


async def cleanup_db(app: FastAPI):
    db_manager = getattr(app.state, "db_manager", None)
    if db_manager:
        await db_manager.async_engine.dispose()
