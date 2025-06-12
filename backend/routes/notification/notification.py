from typing import Annotated, List

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_current_principals, get_db_session
from backend.common.utils.response_builder import build_schema
from backend.core.database.models.notification import Notification
from backend.routes.notification import schemas
from backend.routes.notification.broker import producer

router = APIRouter(tags=["Notifications"])


@router.get("/notification", response_model=List[schemas.BaseNotification])
async def get(
    request: Request,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
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


async def send(
    request: Request,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    notification_data: schemas.RequestNotiification,
    session: AsyncSession,
) -> schemas.ModifiedNotification:
    qb: QueryBuilder = QueryBuilder(session=session, model=Notification)
    notification: Notification = await qb.add(data=notification_data)

    if not notification_data.tg_id:
        return

    switch: bool = not await request.app.state.redis.exists(
        f"notification:{notification_data.tg_id}"
    )
    modified_notification: schemas.ModifiedNotification = build_schema(
        schemas.ModifiedNotification,
        schemas.BaseNotification.model_validate(notification),
        switch=switch,
    )
    await producer.send_notification(
        channel=request.app.state.rbq_channel, notification=modified_notification
    )
    return modified_notification
