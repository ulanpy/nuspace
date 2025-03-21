from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database.models import User


async def get_telegram_id(session: AsyncSession,
                          sub: str) -> int | None:
    result = await session.execute(select(User.telegram_id).filter_by(sub=sub))
    user_id: int | None = result.scalars().first()
    return user_id


async def set_telegram_id(session: AsyncSession,
                          sub: str,
                          user_id: int) -> int:
    result = await session.execute(select(User).filter_by(sub=sub))
    user = result.scalars().first()
    user.telegram_id = user_id
    await session.commit()
    return user_id

