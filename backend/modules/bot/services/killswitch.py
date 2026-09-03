"""Redis-backed killswitch for dev group anti-spam."""

from backend.modules.bot.consts import KILLSWITCH_REDIS_KEY
from redis.asyncio import Redis


async def is_killswitch_enabled(redis: Redis) -> bool:
    """Return True when new group members should be auto-banned."""
    return bool(await redis.get(KILLSWITCH_REDIS_KEY))


async def enable_killswitch(redis: Redis) -> None:
    await redis.set(KILLSWITCH_REDIS_KEY, "1")


async def disable_killswitch(redis: Redis) -> None:
    await redis.delete(KILLSWITCH_REDIS_KEY)
