from contextlib import asynccontextmanager

from fastapi import FastAPI
from google.auth.credentials import Credentials

# Register Rabbit subscribers before the broker starts.
import backend.modules.notification.tasks  # noqa: F401
from backend.bootstrap.db import cleanup_db, setup_db
from backend.bootstrap.gcp import setup_gcp
from backend.bootstrap.meilisearch import cleanup_meilisearch, setup_meilisearch
from backend.bootstrap.rbq import cleanup_rbq, setup_rbq
from backend.bootstrap.redis import cleanup_redis, setup_redis
from backend.core.configs.config import Config
from backend.modules.auth.app_token import AppTokenManager
from backend.modules.auth.keycloak_manager import KeyCloakManager
from backend.modules.bot.startup import cleanup_bot, setup_bot
from backend.modules.campuscurrent.search_indexes import (
    MEILISEARCH_INDEXES as CAMPUSCURRENT_MEILI_INDEXES,
)
from backend.modules.courses.registrar.startup import (
    cleanup_schedule_catalog,
    setup_schedule_catalog,
)
from backend.modules.courses.search_indexes import (
    MEILISEARCH_INDEXES as COURSES_MEILI_INDEXES,
)
from backend.modules.opportunities.search_indexes import (
    MEILISEARCH_INDEXES as OPPORTUNITIES_MEILI_INDEXES,
)
from backend.modules.routers import routers


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        app.state.kc_manager = KeyCloakManager()  # type: ignore
        app.state.config = Config()  # type: ignore
        app.state.app_token_manager = AppTokenManager()
        app.state.signing_credentials: Credentials | None = None
        setup_gcp(app)
        await setup_rbq(app)
        await setup_db(app)
        await setup_redis(app)
        await setup_meilisearch(
            app,
            index_configs=[
                *CAMPUSCURRENT_MEILI_INDEXES,
                *COURSES_MEILI_INDEXES,
                *OPPORTUNITIES_MEILI_INDEXES,
            ],
            after_sync=[setup_schedule_catalog],
            on_cleanup=[cleanup_schedule_catalog],
        )

        await setup_bot(app)

        for router in routers:
            app.include_router(router)
        yield

    finally:
        await cleanup_rbq(app)
        await cleanup_bot(app)
        await cleanup_meilisearch(app)
        await cleanup_redis(app)
        await cleanup_db(app)
