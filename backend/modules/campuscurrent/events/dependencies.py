from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_db_session
from backend.modules.auth.dependencies import get_creds_or_401
from backend.core.database.models import Event
from backend.core.database.models.user import User
from backend.modules.campuscurrent.events import schemas


async def event_exists_or_404(
    event_id: int,
    db_session: AsyncSession = Depends(get_db_session),
) -> Event:
    stmt = select(Event).where(Event.id == event_id)
    result = await db_session.execute(stmt)
    event = result.scalars().first()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event


async def user_exists_or_404(
    event_data: schemas.EventCreateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
) -> User:
    sub = user[0]["sub"] if event_data.creator_sub == "me" else event_data.creator_sub
    stmt = select(User).where(User.sub == sub)
    result = await db_session.execute(stmt)
    db_user = result.scalars().first()
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user
