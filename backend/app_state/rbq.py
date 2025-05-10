import asyncio

import aio_pika
from fastapi import FastAPI

from backend.core.configs.config import config
from backend.rbq.consumer import consumer_notification


async def setup_rbq(app: FastAPI):
    app.state.rbq_connection = await aio_pika.connect_robust(config.CELERY_BROKER_URL)
    app.state.rbq_channel = await app.state.rbq_connection.channel()
    asyncio.create_task(consumer_notification(app.state.rbq_channel))
    await app.state.rbq_channel.set_qos(prefetch_count=1)


async def cleanup_rbq(app: FastAPI):
    rbq_channel = getattr(app.state, "rbq_channel", None)
    rbq_connection = getattr(app.state, "rbq_connection", None)
    if rbq_channel:
        await rbq_channel.close()
    if rbq_connection:
        await rbq_connection.close()
