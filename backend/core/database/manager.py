from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession, AsyncEngine
from typing import AsyncGenerator

from backend.core.database.models import Base
from backend.core.configs.config import DATABASE_URL


class AsyncDatabaseManager:
    def __init__(self):
        self.async_engine = create_async_engine(
            DATABASE_URL,
            query_cache_size=1200,
            pool_size=20,
            max_overflow=200,
            future=True,
            echo=False
        )
        self.async_session_maker = async_sessionmaker(
            bind=self.async_engine,
            expire_on_commit=False,
            autocommit=True
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


