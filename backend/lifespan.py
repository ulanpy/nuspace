from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend.app_state.bot import cleanup_bot, setup_bot
from backend.app_state.db import cleanup_db, setup_db
from backend.app_state.meilisearch import cleanup_meilisearch, setup_meilisearch
from backend.app_state.redis import cleanup_redis, setup_redis
from backend.routes import get_admin, routers


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await setup_db(app)
        await setup_redis(app)
        await setup_meilisearch(app)
        await setup_bot(app)

        for router in routers:
            app.include_router(router)

        get_admin(app)
        yield

    finally:
        await cleanup_bot(app)
        await cleanup_meilisearch(app)
        await cleanup_redis(app)
        await cleanup_db(app)
