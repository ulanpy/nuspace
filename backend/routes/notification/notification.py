from typing import Annotated, List

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_creds_or_401, get_db_session
from backend.core.database.models.notification import Notification
from backend.routes.notification import schemas

router = APIRouter(tags=["Notifications"])


@router.get("/notification", response_model=List[schemas.BaseNotification])
async def get(
    request: Request,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    page: int = 1,
    size: int = 10,
    session: AsyncSession = Depends(get_db_session),
) -> List[schemas.BaseNotification]:
    qb: QueryBuilder = QueryBuilder(session=session, model=Notification)
    notifications: List[Notification] = await (
        qb.base()
        .filter(Notification.receiver_sub == user[0]["sub"])
        .paginate(page=page, size=size)
        .order(Notification.created_at.desc())
        .all()
    )
    return [schemas.BaseNotification.model_validate(notification) for notification in notifications]
