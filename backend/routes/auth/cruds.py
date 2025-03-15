from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete, insert, update, text, Interval, cast

from backend.core.database.models import User
from backend.routes.auth.schemas import UserSchema
from backend.common.schemas import JWTSchema

async def upsert_user(session: AsyncSession, user_schema: UserSchema):
    # Query if the user already exists using the 'sub' field
    result = await session.execute(select(User).filter_by(sub=user_schema.sub))
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



async def get_user_refresh_token(session: AsyncSession, jwtdata: JWTSchema) -> str | None:
    result = await session.execute(select(User.refresh_token).filter_by(sub=jwtdata.sub))
    refresh_token = result.scalars().first()
    return refresh_token

async def get_user_role(session: AsyncSession, sub: str) -> str | None:
    result = await session.execute(select(User.role).filter_by(sub=sub))
    user_role = result.scalars().first()
    return user_role.value if user_role else None  # Convert enum to string
