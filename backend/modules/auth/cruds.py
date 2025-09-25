from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database.models import User
from backend.modules.auth.schemas import UserSchema


async def upsert_user(session: AsyncSession, user_schema: UserSchema) -> User:
    """
    Upsert a user into the database
    """
    # Query if the user already exists using the 'sub' field
    result = await session.execute(
        select(User).filter(or_(User.sub == user_schema.sub, User.email == user_schema.email))
    )
    user_db = result.scalars().first()

    if user_db:
        # User exists, update the user's information using unpacking
        for key, value in user_schema.model_dump().items():
            if key not in ["role", "scope"]:  # Exclude role and scope from updates
                setattr(user_db, key, value)
    else:
        # User does not exist, create a new user
        user_db = User(**user_schema.model_dump())
        session.add(user_db)

    # Commit the session and refresh the user instance to get all the latest data
    await session.commit()
    await session.refresh(user_db)

    return user_db
