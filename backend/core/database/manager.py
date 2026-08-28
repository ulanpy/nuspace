from typing import AsyncGenerator

from backend.bootstrap.tracing import instrument_async_engine
from backend.core.configs.config import config
from backend.core.database.model_registry import import_models
from backend.middlewares.metrics import configure_database_pool_metrics
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import_models()


class AsyncDatabaseManager:
    def __init__(self):
        pool_size = 60
        max_overflow = 20
        self.async_engine = create_async_engine(
            config.DATABASE_URL,
            query_cache_size=1200,
            pool_size=pool_size,
            max_overflow=max_overflow,
            future=True,
            echo=False,
        )
        configure_database_pool_metrics(
            self.async_engine.sync_engine.pool,
            capacity=pool_size + max_overflow,
        )
        instrument_async_engine(self.async_engine)
        self.async_session_maker = async_sessionmaker(
            bind=self.async_engine,
            expire_on_commit=False,
        )

    # this function returns async session used in fastapi dependency injections
    async def get_async_session(self) -> AsyncGenerator[AsyncSession, None]:
        async with self.async_session_maker() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    def get_session_maker(self) -> async_sessionmaker[AsyncSession]:
        return self.async_session_maker
