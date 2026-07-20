from fastapi import FastAPI
from faststream.rabbit import RabbitBroker

from backend.core.configs.config import config

broker = RabbitBroker(config.CELERY_BROKER_URL)


async def setup_rbq(app: FastAPI) -> None:
    """Connect and start the shared Rabbit broker.

    Subscribers must be imported before this runs so ``@broker.subscriber``
    handlers are registered (see ``lifespan.py``).
    """
    await broker.connect()
    await broker.start()
    app.state.broker = broker


async def cleanup_rbq(app: FastAPI) -> None:
    await broker.stop()
    app.state.broker = None
