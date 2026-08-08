from typing import Annotated, List

from fastapi import APIRouter, Depends
from sqlalchemy import select

from backend.common.dependencies import get_uow
from backend.modules.auth.dependencies import get_creds_or_401
from backend.core.database.uow import UnitOfWork
from backend.modules.notification.models import Notification
from backend.modules.notification import schemas

router = APIRouter(tags=["Notifications"])


@router.get("/notification", response_model=List[schemas.BaseNotification])
async def get(
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    page: int = 1,
    size: int = 10,
    uow: UnitOfWork = Depends(get_uow),
) -> List[schemas.BaseNotification]:
    page_num = max(1, page or 1)
    stmt = (
        select(Notification)
        .where(Notification.receiver_sub == user[0]["sub"])
        .order_by(Notification.created_at.desc())
        .offset((page_num - 1) * size)
        .limit(size)
    )
    async with uow:
        result = await uow.require_session().execute(stmt)
        notifications: List[Notification] = list(result.scalars().all())
    return [schemas.BaseNotification.model_validate(notification) for notification in notifications]
