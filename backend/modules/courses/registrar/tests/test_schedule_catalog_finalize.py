"""Unit tests for RegistrarService schedule-catalog GCS finalize + claim."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from backend.modules.courses.registrar.service import (
    RegistrarService,
    ScheduleCatalogFinalizeError,
)


def _service(*, redis=None) -> RegistrarService:
    return RegistrarService(
        redis=redis or AsyncMock(),
        meilisearch_client=AsyncMock(),
        storage_client=MagicMock(),
        bucket_name="bucket",
        schedule_gcs_object="registrar/course_schedule_catalog.json",
    )


def test_catalog_sync_token_prefers_generation():
    assert (
        RegistrarService._catalog_sync_token(generation="123", md5_hash="abc", etag='"x"') == "123"
    )


def test_catalog_sync_token_falls_back():
    assert RegistrarService._catalog_sync_token(generation=None, md5_hash="abc") == "abc"
    assert RegistrarService._catalog_sync_token(generation=None, md5_hash=None, etag='"e"') == '"e"'
    assert RegistrarService._catalog_sync_token(generation=None) == "unknown"


@pytest.mark.asyncio
async def test_acquire_skips_when_already_processed():
    redis = AsyncMock()
    redis.exists = AsyncMock(return_value=1)
    service = _service(redis=redis)

    assert await service._try_acquire_catalog_sync("gen1") is False
    redis.set.assert_not_called()


@pytest.mark.asyncio
async def test_acquire_skips_when_lock_held():
    redis = AsyncMock()
    redis.exists = AsyncMock(return_value=0)
    redis.set = AsyncMock(return_value=False)
    service = _service(redis=redis)

    assert await service._try_acquire_catalog_sync("gen1") is False


@pytest.mark.asyncio
async def test_acquire_succeeds_for_first_caller():
    redis = AsyncMock()
    redis.exists = AsyncMock(side_effect=[0, 0])
    redis.set = AsyncMock(return_value=True)
    service = _service(redis=redis)

    assert await service._try_acquire_catalog_sync("gen1") is True
    redis.set.assert_awaited_once()
    assert redis.set.await_args.kwargs["nx"] is True


@pytest.mark.asyncio
async def test_acquire_releases_lock_if_processed_during_claim():
    redis = AsyncMock()
    redis.exists = AsyncMock(side_effect=[0, 1])
    redis.set = AsyncMock(return_value=True)
    redis.delete = AsyncMock()
    service = _service(redis=redis)

    assert await service._try_acquire_catalog_sync("gen1") is False
    redis.delete.assert_awaited_once()


@pytest.mark.asyncio
async def test_finalize_skips_when_claim_not_acquired():
    service = _service()
    with patch.object(service, "_try_acquire_catalog_sync", new=AsyncMock(return_value=False)):
        result = await service.on_catalog_object_finalize(generation="g1")

    assert result.skipped is True
    assert result.reason == "duplicate_or_in_flight"


@pytest.mark.asyncio
async def test_finalize_syncs_and_marks_done():
    service = _service()
    with (
        patch.object(service, "_try_acquire_catalog_sync", new=AsyncMock(return_value=True)),
        patch(
            "backend.modules.courses.registrar.service.sync_schedule_catalog",
            new=AsyncMock(return_value=818),
        ) as sync,
        patch.object(service, "_mark_catalog_sync_done", new=AsyncMock()) as done,
    ):
        result = await service.on_catalog_object_finalize(generation="g1")

    assert result.skipped is False
    assert result.schedule_docs == 818
    sync.assert_awaited_once()
    done.assert_awaited_once()


@pytest.mark.asyncio
async def test_finalize_releases_lock_on_sync_error():
    service = _service()
    with (
        patch.object(service, "_try_acquire_catalog_sync", new=AsyncMock(return_value=True)),
        patch(
            "backend.modules.courses.registrar.service.sync_schedule_catalog",
            new=AsyncMock(side_effect=RuntimeError("meili down")),
        ),
        patch.object(service, "_release_catalog_sync_lock", new=AsyncMock()) as release,
    ):
        with pytest.raises(ScheduleCatalogFinalizeError):
            await service.on_catalog_object_finalize(generation="g1")

    release.assert_awaited_once()
