from typing import Annotated, List

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_creds_or_401, get_db_session
from backend.core.database.models.notification import Notification
from backend.modules.notification import schemas

router = APIRouter(tags=["Notifications"])


@router.get("/notification", response_model=List[schemas.BaseNotification])
async def get(
    request: Request,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    page: int = 1,
    size: int = 10,
    session: AsyncSession = Depends(get_db_session),
) -> List[schemas.BaseNotification]:
    page_num = max(1, page or 1)
    stmt = (
        select(Notification)
        .where(Notification.receiver_sub == user[0]["sub"])
        .order_by(Notification.created_at.desc())
        .offset((page_num - 1) * size)
        .limit(size)
    )
    result = await session.execute(stmt)
    notifications: List[Notification] = list(result.scalars().all())
    return [schemas.BaseNotification.model_validate(notification) for notification in notifications]
