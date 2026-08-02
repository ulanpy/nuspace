"""Unit tests for schedule catalog GCS hook Redis claim/lock."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from backend.modules.courses.registrar.schedule_catalog_claim import (
    mark_schedule_catalog_sync_done,
    release_schedule_catalog_sync_lock,
    schedule_catalog_sync_token,
    try_acquire_schedule_catalog_sync,
)


def test_sync_token_prefers_generation():
    assert schedule_catalog_sync_token(generation="123", md5_hash="abc", etag='"x"') == "123"


def test_sync_token_falls_back():
    assert schedule_catalog_sync_token(generation=None, md5_hash="abc") == "abc"
    assert schedule_catalog_sync_token(generation=None, md5_hash=None, etag='"e"') == '"e"'
    assert schedule_catalog_sync_token(generation=None) == "unknown"


@pytest.mark.asyncio
async def test_acquire_skips_when_already_processed():
    redis = AsyncMock()
    redis.exists = AsyncMock(return_value=1)

    assert await try_acquire_schedule_catalog_sync(redis, "gen1") is False
    redis.set.assert_not_called()


@pytest.mark.asyncio
async def test_acquire_skips_when_lock_held():
    redis = AsyncMock()
    redis.exists = AsyncMock(return_value=0)
    redis.set = AsyncMock(return_value=False)

    assert await try_acquire_schedule_catalog_sync(redis, "gen1") is False


@pytest.mark.asyncio
async def test_acquire_succeeds_for_first_caller():
    redis = AsyncMock()
    redis.exists = AsyncMock(side_effect=[0, 0])
    redis.set = AsyncMock(return_value=True)

    assert await try_acquire_schedule_catalog_sync(redis, "gen1") is True
    redis.set.assert_awaited_once()
    assert redis.set.await_args.kwargs["nx"] is True


@pytest.mark.asyncio
async def test_acquire_releases_lock_if_processed_during_claim():
    redis = AsyncMock()
    redis.exists = AsyncMock(side_effect=[0, 1])
    redis.set = AsyncMock(return_value=True)
    redis.delete = AsyncMock()

    assert await try_acquire_schedule_catalog_sync(redis, "gen1") is False
    redis.delete.assert_awaited_once()


@pytest.mark.asyncio
async def test_mark_done_sets_processed_and_drops_lock():
    pipe = MagicMock()
    pipe.set = MagicMock(return_value=pipe)
    pipe.delete = MagicMock(return_value=pipe)
    pipe.execute = AsyncMock(return_value=[True, 1])
    pipe.__aenter__ = AsyncMock(return_value=pipe)
    pipe.__aexit__ = AsyncMock(return_value=None)

    redis = MagicMock()
    redis.pipeline = MagicMock(return_value=pipe)

    await mark_schedule_catalog_sync_done(redis, "gen1")
    pipe.set.assert_called_once()
    pipe.delete.assert_called_once()
    pipe.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_release_lock():
    redis = AsyncMock()
    await release_schedule_catalog_sync_lock(redis, "gen1")
    redis.delete.assert_awaited_once_with("schedule_catalog:lock:gen1")
