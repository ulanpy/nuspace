"""Unit of Work for short-lived database transactions."""

from collections.abc import Callable
from typing import Any, TypeVar

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

R = TypeVar("R")


class UnitOfWork:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self.session_factory = session_factory
        self.session: AsyncSession | None = None
        self._depth = 0
        self._rollback_only = False

    async def __aenter__(self) -> "UnitOfWork":
        if self._depth == 0:
            self.session = self.session_factory()
            self._rollback_only = False
        self._depth += 1
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        if exc_type is not None:
            self._rollback_only = True
        self._depth -= 1

        if self._depth == 0 and self.session:
            try:
                if self._rollback_only:
                    await self.session.rollback()
                else:
                    await self.session.commit()
            finally:
                await self.session.close()
                self.session = None

    def get_repo(self, repo_cls: Callable[[AsyncSession], R]) -> R:
        """Динамически создает репозиторий и привязывает его к активной сессии."""
        if self.session is None:
            raise RuntimeError(
                "Транзакция не открыта! Используйте 'async with uow:' перед вызовом get_repo()."
            )
        return repo_cls(self.session)

    def require_session(self) -> AsyncSession:
        """Return the active session, failing loudly outside a UoW scope."""
        if self.session is None:
            raise RuntimeError("No active transaction")
        return self.session
