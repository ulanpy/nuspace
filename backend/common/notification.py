from backend.common.cruds import QueryBuilder
from backend.common.utils.response_builder import build_schema
from backend.core.database.models.notification import Notification
from backend.routes.notification import schemas
from fastapi import Request
from faststream.rabbit import RabbitBroker
from sqlalchemy.ext.asyncio import AsyncSession


async def send(
    *,
    request: Request,
    user: tuple[dict, dict],
    notification_data: schemas.RequestNotiification,
    session: AsyncSession,
    broker: RabbitBroker,
) -> schemas.ModifiedNotification:
    qb: QueryBuilder = QueryBuilder(session=session, model=Notification)
    notification: Notification = await qb.add(data=notification_data)

    switch: bool = not await request.app.state.redis.exists(
        f"notification:{notification_data.tg_id}"
    )
    modified_notification: schemas.ModifiedNotification = build_schema(
        schemas.ModifiedNotification,
        schemas.BaseNotification.model_validate(notification),
        switch=switch,
    )
    await broker.publish(modified_notification, queue="notifications")
    return modified_notification
