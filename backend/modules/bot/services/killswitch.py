from redis.asyncio import Redis

from backend.modules.bot.consts import KILLSWITCH_REDIS_KEY


async def is_killswitch_enabled(redis: Redis) -> bool:
    return bool(await redis.get(KILLSWITCH_REDIS_KEY))


async def enable_killswitch(redis: Redis) -> None:
    await redis.set(KILLSWITCH_REDIS_KEY, "1")


async def disable_killswitch(redis: Redis) -> None:
    await redis.delete(KILLSWITCH_REDIS_KEY)
