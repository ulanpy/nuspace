from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession, AsyncEngine
from typing import AsyncGenerator
from contextlib import contextmanager

from backend.core.database.models import Base
from backend.core.configs.config import config


class AsyncDatabaseManager:
    def __init__(self):
        self.async_engine = create_async_engine(
            config.DATABASE_URL,
            query_cache_size=1200,
            pool_size=20,
            max_overflow=200,
            future=True,
            echo=False
        )
        self.async_session_maker = async_sessionmaker(
            bind=self.async_engine,
            expire_on_commit=False,
        )

    async def create_all_tables(self) -> None:
        async with self.async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await self.async_engine.dispose()


    # this function returns async session used in fastapi dependency injections
    async def get_async_session(self) -> AsyncGenerator[AsyncSession, None]:
        async with self.async_session_maker() as session:
            try:
                yield session
            finally:
                await session.close()





from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

class SyncDatabaseManager:
    def __init__(self):
        self.sync_engine = create_engine(
            config.DATABASE_URL_SYNC,
            pool_size=5,
            max_overflow=10,
            pool_timeout=30,
            future=True,
            echo=False
        )
        self.sync_session_maker = sessionmaker(
            bind=self.sync_engine,
            expire_on_commit=False,
        )

    def create_all_tables(self) -> None:
        with self.sync_engine.begin() as conn:
            Base.metadata.create_all(conn)

    def get_sync_session(self) -> Session:
        return self.sync_session_maker()
