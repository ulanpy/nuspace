from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.modules.auth.models import User


class ProfileRepository:
    """A profile page is columns on `users`, so this reads and writes `users` rows."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_sub(self, sub: str) -> User | None:
        return await self.session.get(User, sub)

    async def get_by_handle(self, handle: str) -> User | None:
        result = await self.session.execute(
            select(User).where(User.handle == handle).options(selectinload(User.department))
        )
        return result.scalars().first()

    async def handle_taken(self, handle: str, *, by_other_than: str) -> bool:
        result = await self.session.execute(
            select(User.sub).where(User.handle == handle, User.sub != by_other_than)
        )
        return result.first() is not None

    async def flush(self) -> None:
        await self.session.flush()
