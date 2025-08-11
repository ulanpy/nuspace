from fastapi import FastAPI
from redis.asyncio import ConnectionPool, Redis

from backend.core.configs.config import config


async def setup_redis(app: FastAPI):
    redis_pool = ConnectionPool.from_url(
        config.REDIS_URL,
        max_connections=50,
        socket_connect_timeout=5,
        socket_timeout=10,
        health_check_interval=30,
        retry_on_timeout=True,
        decode_responses=True,
    )
    app.state.redis = Redis(connection_pool=redis_pool)


async def cleanup_redis(app: FastAPI):
    if redis := getattr(app.state, "redis", None):
        await redis.aclose()
