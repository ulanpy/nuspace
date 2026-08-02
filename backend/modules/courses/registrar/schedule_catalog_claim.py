"""Redis claim/lock for schedule-catalog GCS hook dedupe.

Duplicate Pub/Sub deliveries share the same GCS object generation. Only one
caller should run Meilisearch sync; others ACK 200 without work.
"""

from __future__ import annotations

import logging

from redis.asyncio import Redis

logger = logging.getLogger(__name__)

LOCK_TTL_SECONDS = 120
PROCESSED_TTL_SECONDS = 86_400


def _processed_key(token: str) -> str:
    return f"schedule_catalog:processed:{token}"


def _lock_key(token: str) -> str:
    return f"schedule_catalog:lock:{token}"


def schedule_catalog_sync_token(
    *,
    generation: str | None,
    md5_hash: str | None = None,
    etag: str | None = None,
) -> str:
    """Stable id for one catalog object version (prefer GCS generation)."""
    for candidate in (generation, md5_hash, etag):
        if candidate:
            return candidate
    return "unknown"


async def try_acquire_schedule_catalog_sync(redis: Redis, token: str) -> bool:
    """
    Return True if this caller should run sync.

    False means the same generation was already processed or another hook is
    in-flight — caller should return HTTP 200 without syncing.
    """
    processed_key = _processed_key(token)
    lock_key = _lock_key(token)

    if await redis.exists(processed_key):
        logger.info("Schedule catalog sync skip: already processed (%s)", token)
        return False

    acquired = await redis.set(lock_key, "1", nx=True, ex=LOCK_TTL_SECONDS)
    if not acquired:
        logger.info("Schedule catalog sync skip: lock held (%s)", token)
        return False

    # Another hook may have finished between exists() and SET NX.
    if await redis.exists(processed_key):
        await redis.delete(lock_key)
        logger.info("Schedule catalog sync skip: processed during claim (%s)", token)
        return False

    return True


async def mark_schedule_catalog_sync_done(redis: Redis, token: str) -> None:
    processed_key = _processed_key(token)
    lock_key = _lock_key(token)
    async with redis.pipeline(transaction=True) as pipe:
        pipe.set(processed_key, "1", ex=PROCESSED_TTL_SECONDS)
        pipe.delete(lock_key)
        await pipe.execute()


async def release_schedule_catalog_sync_lock(redis: Redis, token: str) -> None:
    await redis.delete(_lock_key(token))
