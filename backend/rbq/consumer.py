from aio_pika.abc import AbstractRobustChannel

from backend.rbq.tasks import task


async def consumer_notification(channel: AbstractRobustChannel, routing_key: str = "notifications"):
    queue = await channel.declare_queue(routing_key, durable=True)

    await queue.consume(task, no_ack=False)
