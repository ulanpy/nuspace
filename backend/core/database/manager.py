from typing import AsyncGenerator

from backend.core.configs.config import config
from backend.core.database.model_registry import import_models
from backend.core.database.models.base import Base
from backend.telemetry import instrument_async_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import_models()


class AsyncDatabaseManager:
    def __init__(self):
        self.async_engine = create_async_engine(
            config.DATABASE_URL,
            query_cache_size=1200,
            pool_size=20,
            max_overflow=20,
            future=True,
            echo=False,
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
