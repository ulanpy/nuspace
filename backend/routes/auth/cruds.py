from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from backend.core.database.models import User
from backend.routes.auth.schemas import UserSchema


async def upsert_user(session: AsyncSession, user_schema: UserSchema):
    # Query if the user already exists using the 'sub' field
    result = await session.execute(
        select(User).filter(
            or_(User.sub == user_schema.sub, User.email == user_schema.email)
        )
    )
    user_db = result.scalars().first()

    if user_db:
        # User exists, update the user's information using unpacking
        for key, value in user_schema.dict().items():
            if key not in ["role", "scope"]:  # Exclude role and scope from updates
                setattr(user_db, key, value)
    else:
        # User does not exist, create a new user
        user_db = User(**user_schema.dict())
        session.add(user_db)

    # Commit the session and refresh the user instance to get all the latest data
    await session.commit()
    await session.refresh(user_db)

    return user_db


async def get_user_role(session: AsyncSession, sub: str) -> str | None:
    result = await session.execute(select(User.role).filter_by(sub=sub))
    user_role = result.scalars().first()
    return user_role.value if user_role else None  # Convert enum to string


# SYNC VERSION (for SyncDatabaseManager)
def get_user_role_sync(session: Session, sub: str) -> str | None:
    result = session.execute(select(User.role).filter_by(sub=sub))
    # Sync execute
    user_role = result.scalars().first()
    return user_role.value if user_role else None  # Convert enum to string
