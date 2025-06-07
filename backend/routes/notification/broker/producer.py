import json

from aio_pika import Message
from aio_pika.abc import AbstractRobustChannel, DeliveryMode

from backend.routes.notification.schemas import ModifiedNotification


async def send_notification(
    channel: AbstractRobustChannel,
    notification: ModifiedNotification,
    routing_key: str = "notifications",
):
    message_body = json.dumps(notification.model_dump(mode="json")).encode("utf-8")
    message: Message = Message(
        body=message_body, content_type="application/json", delivery_mode=DeliveryMode.PERSISTENT
    )
    await channel.default_exchange.publish(message, routing_key=routing_key)
