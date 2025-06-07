from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_db_session
from backend.core.database.models import Event


async def event_exists_or_404(
    event_id: int,
    db_session: AsyncSession = Depends(get_db_session),
) -> Event:
    qb = QueryBuilder(session=db_session, model=Event)
    event = await qb.base().filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event
