from collections.abc import Collection

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.modules.auth.models import User
from backend.modules.pages.models.page import PageVisibility
from backend.modules.sgotinish.models import Department


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

    async def list_listed(
        self,
        *,
        tiers: Collection[PageVisibility],
        keyword: str | None,
        page: int,
        size: int,
    ) -> tuple[list[User], int]:
        """The people directory: profile pages in `tiers` that have a handle.

        `tiers` is `tiers_open_to(viewer)`, the same call a read by handle makes,
        so the rows and the count are exactly the profiles this viewer may open.
        `private` is never listed to its own person: listing derives from the tier.
        """
        conditions = [User.handle.is_not(None), User.profile_visibility.in_(tiers)]
        if keyword:
            needle = "%" + keyword.strip().replace("\\", "\\\\").replace("%", "\\%").replace(
                "_", "\\_"
            ) + "%"
            conditions.append(
                or_(
                    User.name.ilike(needle, escape="\\"),
                    User.surname.ilike(needle, escape="\\"),
                    func.concat(User.name, " ", User.surname).ilike(needle, escape="\\"),
                    User.handle.ilike(needle, escape="\\"),
                    Department.name.ilike(needle, escape="\\"),
                )
            )
        base = select(User).outerjoin(Department, User.department_id == Department.id)
        stmt = (
            base.where(*conditions)
            .options(selectinload(User.department))
            .order_by(User.name.asc(), User.surname.asc(), User.handle.asc())
            .offset((max(1, page) - 1) * size)
            .limit(size)
        )
        users = list((await self.session.execute(stmt)).scalars().all())
        count_stmt = (
            select(func.count())
            .select_from(User)
            .outerjoin(Department, User.department_id == Department.id)
            .where(*conditions)
        )
        return users, (await self.session.execute(count_stmt)).scalar() or 0

    async def handle_taken(self, handle: str, *, by_other_than: str) -> bool:
        result = await self.session.execute(
            select(User.sub).where(User.handle == handle, User.sub != by_other_than)
        )
        return result.first() is not None

    async def flush(self) -> None:
        await self.session.flush()
