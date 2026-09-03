from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.auth.models import User
from backend.modules.auth.schemas import UserSchema
from backend.modules.shared.slug import generate_unique_slug


class UserRepository:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def upsert(self, user_schema: UserSchema) -> User:
        result = await self.db_session.execute(
            select(User).filter(or_(User.sub == user_schema.sub, User.email == user_schema.email))
        )
        user_db = result.scalars().first()

        if user_db:
            for key, value in user_schema.model_dump().items():
                if key not in ("role", "scope") and value is not None:
                    setattr(user_db, key, value)
        else:
            data = user_schema.model_dump()
            if not data.get("slug"):
                full_name = f"{data.get('name', '')} {data.get('surname', '')}".strip()
                data["slug"] = await generate_unique_slug(
                    full_name or "user", User, session=self.db_session
                )
            user_db = User(**data)
            self.db_session.add(user_db)

        if not user_db.slug:
            full_name = f"{user_db.name} {user_db.surname}".strip()
            user_db.slug = await generate_unique_slug(
                full_name or "user", User, session=self.db_session
            )

        await self.db_session.flush()
        await self.db_session.refresh(user_db)
        return user_db

    async def get_by_sub(self, sub: str) -> User | None:
        result = await self.db_session.execute(select(User).where(User.sub == sub))
        return result.scalars().first()
