from fastapi import FastAPI
from faststream.rabbit import RabbitBroker

from backend.modules.notification import tasks


async def setup_rbq(app: FastAPI):
    broker: RabbitBroker = tasks.broker
    await broker.connect()
    await broker.start()

    app.state.broker = broker


async def cleanup_rbq(app: FastAPI):
    broker: RabbitBroker = tasks.broker
    await broker.stop()
    app.state.broker = None
