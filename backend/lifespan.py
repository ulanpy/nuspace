from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend.app_state.bot import cleanup_bot, setup_bot
from backend.app_state.db import cleanup_db, setup_db
from backend.app_state.gcp import setup_gcp
from backend.app_state.meilisearch import cleanup_meilisearch, setup_meilisearch
# from backend.app_state.rbq import cleanup_rbq, setup_rbq
from backend.app_state.redis import cleanup_redis, setup_redis
from backend.core.configs.config import Config
from backend.routes import routers
from backend.routes.auth.app_token import AppTokenManager
from backend.routes.auth.keycloak_manager import KeyCloakManager


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        app.state.kc_manager = KeyCloakManager()  # type: ignore
        app.state.config = Config()  # type: ignore
        app.state.app_token_manager = AppTokenManager()
        setup_gcp(app)
        # await setup_rbq(app)
        await setup_db(app)
        await setup_redis(app)
        await setup_meilisearch(app)

        await setup_bot(app)

        for router in routers:
            app.include_router(router)
        yield

    finally:
        # await cleanup_rbq(app)
        await cleanup_bot(app)
        await cleanup_meilisearch(app)
        await cleanup_redis(app)
        await cleanup_db(app)
