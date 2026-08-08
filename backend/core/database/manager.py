import time
from typing import AsyncGenerator

from backend.core.configs.config import config
from backend.core.database.model_registry import import_models
from backend.telemetry import instrument_async_engine
from prometheus_client import Counter, Gauge, Histogram
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import_models()

DB_POOL_CHECKED_OUT = Gauge(
    "fastapi_db_pool_checked_out",
    "Database connections currently checked out from SQLAlchemy's pool",
)
DB_POOL_SIZE = Gauge(
    "fastapi_db_pool_size",
    "Configured persistent SQLAlchemy database pool size",
)
DB_POOL_OPEN_CONNECTIONS = Gauge(
    "fastapi_db_pool_open_connections",
    "Database connections currently open in SQLAlchemy's pool",
)
DB_POOL_MAX_CONNECTIONS = Gauge(
    "fastapi_db_pool_max_connections",
    "Maximum database connections allowed by SQLAlchemy's pool",
)
DB_POOL_CHECKOUTS = Counter(
    "fastapi_db_pool_checkouts_total",
    "Database connection checkouts from SQLAlchemy's pool",
)
DB_POOL_CONNECTION_HOLD_SECONDS = Histogram(
    "fastapi_db_pool_connection_hold_seconds",
    "Time a database connection remains checked out",
)


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
        self._instrument_pool()
        instrument_async_engine(self.async_engine)
        self.async_session_maker = async_sessionmaker(
            bind=self.async_engine,
            expire_on_commit=False,
        )

    def _instrument_pool(self) -> None:
        """Expose pool saturation and connection-hold time for load-test diagnosis."""
        pool = self.async_engine.sync_engine.pool
        DB_POOL_SIZE.set(pool.size())
        DB_POOL_MAX_CONNECTIONS.set(pool.size() + pool._max_overflow)

        @event.listens_for(pool, "checkout")
        def on_checkout(dbapi_connection, connection_record, connection_proxy) -> None:
            connection_record.info["checked_out_at"] = time.monotonic()
            DB_POOL_CHECKOUTS.inc()
            DB_POOL_CHECKED_OUT.set(pool.checkedout())
            DB_POOL_OPEN_CONNECTIONS.set(pool.size() + pool.overflow())

        @event.listens_for(pool, "checkin")
        def on_checkin(dbapi_connection, connection_record) -> None:
            checked_out_at = connection_record.info.pop("checked_out_at", None)
            if checked_out_at is not None:
                DB_POOL_CONNECTION_HOLD_SECONDS.observe(time.monotonic() - checked_out_at)
            DB_POOL_CHECKED_OUT.set(pool.checkedout())
            DB_POOL_OPEN_CONNECTIONS.set(pool.size() + pool.overflow())

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
