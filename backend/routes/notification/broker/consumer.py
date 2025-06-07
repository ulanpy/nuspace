from aio_pika import Queue
from aio_pika.abc import AbstractRobustChannel

from backend.routes.notification.tasks import task


async def consumer_notification(channel: AbstractRobustChannel, routing_key: str = "notifications"):
    queue: Queue = await channel.declare_queue(routing_key, durable=True)
    await queue.consume(task, no_ack=False)
