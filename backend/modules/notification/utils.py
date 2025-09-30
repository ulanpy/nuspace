from typing import Union, List
import datetime
from backend.common.cruds import QueryBuilder
from backend.common.utils.response_builder import build_schema
from backend.core.database.models.notification import Notification
from backend.modules.notification import schemas
from sqlalchemy.ext.asyncio import AsyncSession
from backend.common.schemas import Infra



async def send(
    *,
    infra: Infra,
    notification_data: Union[schemas.RequestNotiification, List[schemas.RequestNotiification]],
    session: AsyncSession,
):
    """
    Send notification(s) to user(s) through RabbitMQ broker.

    Args:
        infra (Infra): Infrastructure dependencies
        notification_data (Union[schemas.RequestNotiification, List[schemas.RequestNotiification]]): 
            Single notification or list of notifications
        session (AsyncSession): SQLAlchemy async database session

    Returns:
        Union[schemas._RequestNotification, List[schemas._RequestNotification]]: 
            Single modified notification or list of modified notifications

    The function:
    1. Creates new notification record(s) in the database
    2. Checks Redis to determine if notification should be sent (switch flag)
    3. Publishes the notification(s) to RabbitMQ queue for processing
    """
    # Handle single notification
    if not isinstance(notification_data, list):
        if notification_data.telegram_id is None:
            return None

        qb: QueryBuilder = QueryBuilder(session=session, model=Notification)
        notification: Notification = await qb.add(data=notification_data)

        switch: bool = not await infra.redis.exists(
            f"notification:{notification_data.telegram_id}"
        )
        modified_notification: schemas._RequestNotification = build_schema(
            schemas._RequestNotification,
            schemas.BaseNotification.model_validate(notification),
            switch=switch,
        )
        await infra.broker.publish(modified_notification, queue="notifications")
        return modified_notification
    
    # Handle list of notifications
    qb: QueryBuilder = QueryBuilder(session=session, model=Notification)
    
    # Convert schema objects to ORM model instances
    notification_instances = []
    for notification_schema in notification_data:
        if notification_schema.telegram_id is None:
            continue
        notification_instance = Notification(
            title=notification_schema.title,
            message=notification_schema.message,
            notification_source=notification_schema.notification_source,
            receiver_sub=notification_schema.receiver_sub,
            type=notification_schema.type,
            tg_id=notification_schema.telegram_id,
            url=notification_schema.url,
        )
        notification_instances.append(notification_instance)
    
    if not notification_instances:
        return []

    # Add instances to database (add_orm_list doesn't return the instances)
    await qb.add_orm_list(notification_instances)
    
    modified_notifications: List[schemas._RequestNotification] = []
    
    # Process each notification schema for Redis check and publishing
    for notification_schema in notification_data:
        if notification_schema.telegram_id is None:
            continue
        switch: bool = not await infra.redis.exists(
            f"notification:{notification_schema.telegram_id}"
        )
        # Create a BaseNotification from the schema for build_schema
        base_notification = schemas.BaseNotification(
            id=0,  # Temporary ID, not used in the final result
            title=notification_schema.title,
            message=notification_schema.message,
            notification_source=notification_schema.notification_source,
            receiver_sub=notification_schema.receiver_sub,
            tg_id=notification_schema.telegram_id,
            type=notification_schema.type,
            url=notification_schema.url,
            created_at=datetime.datetime.now()
        )
        modified_notification: schemas._RequestNotification = build_schema(
            schemas._RequestNotification,
            base_notification,
            switch=switch,
        )
        modified_notifications.append(modified_notification)
        await infra.broker.publish(modified_notification, queue="notifications")
    
    return modified_notifications
    
