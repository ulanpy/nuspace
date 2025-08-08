from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_current_principals, get_db_session
from backend.core.database.models import Event
from backend.core.database.models.user import User
from backend.routes.campuscurrent.events import schemas


async def event_exists_or_404(
    event_id: int,
    db_session: AsyncSession = Depends(get_db_session),
) -> Event:
    qb = QueryBuilder(session=db_session, model=Event)
    event = await qb.base().filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event


async def user_exists_or_404(
    event_data: schemas.EventCreateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
) -> User:
    qb = QueryBuilder(session=db_session, model=User)
    if event_data.creator_sub == "me":
        db_user = await qb.base().filter(User.sub == user[0]["sub"]).first()
    else:
        db_user = await qb.base().filter(User.sub == event_data.creator_sub).first()
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user
