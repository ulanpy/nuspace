"""Ports owned by google_bucket for cross-module GCS finalize handlers."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from backend.modules.media.models import EntityType


class MediaUploadAuthorizer(Protocol):
    """Checks whether a user may attach media to an existing resource."""

    async def authorize_media_upload(
        self,
        *,
        entity_type: EntityType,
        entity_id: int,
        user: tuple[dict, dict],
    ) -> None: ...


class EventMediaUploadAccess(Protocol):
    async def authorize_media_upload(self, event_id: int, user: tuple[dict, dict]) -> None: ...


class CommunityMediaUploadAccess(Protocol):
    async def authorize_media_upload(self, community_id: int, user: tuple[dict, dict]) -> None: ...


@dataclass(frozen=True)
class ScheduleCatalogFinalizeOutcome:
    """Caller-owned DTO for catalog finalize (maps from registrar result)."""

    skipped: bool
    schedule_docs: int = 0
    reason: str | None = None


class ScheduleCatalogOnFinalize(Protocol):
    """Reindex registrar schedule catalog when its GCS object is finalized."""

    async def on_object_finalize(
        self,
        *,
        generation: str | None,
        md5_hash: str | None = None,
        etag: str | None = None,
    ) -> ScheduleCatalogFinalizeOutcome: ...

    async def load_active_semester(self): ...
