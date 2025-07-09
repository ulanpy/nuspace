from fastapi import FastAPI
from faststream.rabbit import RabbitBroker

from backend.common import dependencies


async def setup_rbq(app: FastAPI):
    broker: RabbitBroker = dependencies.broker()
    await broker.connect()
    await broker.start()


async def cleanup_rbq(app: FastAPI):
    broker: RabbitBroker = dependencies.broker()
    await broker.close()
