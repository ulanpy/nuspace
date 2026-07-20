from __future__ import annotations

from typing import List, Sequence, TypeVar

from collections import defaultdict

from sqlalchemy.orm import DeclarativeMeta

from backend.modules.media.models import Media
from backend.modules.media.interfaces import ObjectStorage
from backend.modules.media.repository import MediaRepository
from backend.modules.media.schemas import MediaResponse, MediaUpsertData

T = TypeVar("T", bound=DeclarativeMeta)


class MediaService:
    def __init__(
        self,
        repository: MediaRepository,
        storage: ObjectStorage,
    ):
        self.repository = repository
        self.storage = storage

    async def upsert(self, data: MediaUpsertData) -> Media:
        return await self.repository.upsert(data)

    async def delete(self, media: Media) -> None:
        await self.storage.delete_object(media.name)
        await self.repository.delete(media)

    async def delete_many(self, media_objects: List[Media]) -> None:
        if not media_objects:
            return
        await self.storage.delete_objects([media.name for media in media_objects])
        for media in media_objects:
            await self.repository.delete(media)

    async def list_by_ids(self, media_ids: list[int]) -> list[Media]:
        return await self.repository.list_by_ids(media_ids)

    async def build_url_map(self, media_objects: List[Media]) -> dict[int, str]:
        if not media_objects:
            return {}
        filenames = [media.name for media in media_objects]
        urls = await self.storage.generate_download_urls(filenames)
        return {media.id: url for media, url in zip(media_objects, urls)}

    def to_responses(
        self,
        media_objects: List[Media],
        url_map: dict[int, str],
    ) -> List[MediaResponse]:
        return [
            MediaResponse(
                id=media.id,
                url=url_map.get(media.id, ""),
                mime_type=media.mime_type,
                entity_type=media.entity_type,
                entity_id=media.entity_id,
                media_format=media.media_format,
                media_order=media.media_order,
            )
            for media in media_objects
        ]

    async def build_responses(self, media_objects: List[Media]) -> List[MediaResponse]:
        url_map = await self.build_url_map(media_objects)
        return self.to_responses(media_objects, url_map)

    async def map_to_resources(
        self,
        media_objects: List[Media],
        resources: Sequence[T],
        resource_id_field: str = "id",
    ) -> List[List[MediaResponse]]:
        if not media_objects or not resources:
            return [[] for _ in resources]

        url_map = await self.build_url_map(media_objects)

        media_by_entity_id: dict[int, list[Media]] = defaultdict(list)
        for media in media_objects:
            media_by_entity_id[media.entity_id].append(media)

        result: List[List[MediaResponse]] = []
        for resource in resources:
            resource_id = getattr(resource, resource_id_field, None)
            resource_media = media_by_entity_id.get(resource_id, [])
            result.append(self.to_responses(resource_media, url_map))
        return result
