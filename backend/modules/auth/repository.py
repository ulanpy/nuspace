from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database.models import User
from backend.modules.auth.schemas import UserSchema


class UserRepository:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def upsert(self, user_schema: UserSchema) -> User:
        result = await self.db_session.execute(
            select(User).filter(
                or_(User.sub == user_schema.sub, User.email == user_schema.email)
            )
        )
        user_db = result.scalars().first()

        if user_db:
            for key, value in user_schema.model_dump().items():
                if key not in ("role", "scope"):
                    setattr(user_db, key, value)
        else:
            user_db = User(**user_schema.model_dump())
            self.db_session.add(user_db)

        await self.db_session.flush()
        await self.db_session.refresh(user_db)
        return user_db

    async def get_by_sub(self, sub: str) -> User | None:
        result = await self.db_session.execute(select(User).where(User.sub == sub))
        return result.scalars().first()
