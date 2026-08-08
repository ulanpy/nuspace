# backend/common/dependencies.py

from backend.common.schemas import Infra
from backend.core.database.manager import AsyncDatabaseManager
from fastapi import Request

from backend.core.database.uow import UnitOfWork
from collections.abc import AsyncGenerator


async def get_infra(request: Request) -> Infra:
    """Dependency to get infrastructure dependencies with automatic credential refresh."""
    return Infra(
        meilisearch_client=request.app.state.meilisearch_client,
        storage_client=request.app.state.storage_client,
        config=request.app.state.config,
        signing_credentials=request.app.state.signing_credentials,
        redis=request.app.state.redis,
        broker=request.app.state.broker,
    )


async def get_uow(request: Request) -> AsyncGenerator[UnitOfWork, None]:
    """Dependency to get a UnitOfWork instance."""
    db_manager: AsyncDatabaseManager = request.app.state.db_manager
    uow = UnitOfWork(session_factory=db_manager.get_session_maker())
    yield uow


