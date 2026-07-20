from __future__ import annotations

from typing import Protocol, Sequence, TypeVar

from backend.modules.media.models import Media
from backend.modules.media.schemas import MediaResponse

T = TypeVar("T")


class MediaAttachmentResolver(Protocol):
    async def delete_many(self, media_objects: list[Media]) -> None: ...

    async def list_by_ids(self, media_ids: list[int]) -> list[Media]: ...

    async def build_url_map(self, media_objects: list[Media]) -> dict[int, str]: ...

    def to_responses(
        self,
        media_objects: list[Media],
        url_map: dict[int, str],
    ) -> list[MediaResponse]: ...

    async def map_to_resources(
        self,
        media_objects: list[Media],
        resources: Sequence[T],
        resource_id_field: str = "id",
    ) -> list[list[MediaResponse]]: ...
