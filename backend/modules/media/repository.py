from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database.models.media import Media
from backend.modules.media.schemas import MediaUpsertData


class MediaRepository:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def get_by_id(self, media_id: int) -> Media | None:
        stmt = select(Media).where(Media.id == media_id)
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def list_by_ids(self, media_ids: list[int]) -> list[Media]:
        if not media_ids:
            return []
        stmt = select(Media).where(Media.id.in_(media_ids))
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def find_matching(self, data: MediaUpsertData) -> Media | None:
        stmt = select(Media).where(
            Media.name == data.name,
            Media.entity_type == data.entity_type,
            Media.entity_id == data.entity_id,
            Media.media_format == data.media_format,
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def upsert(self, data: MediaUpsertData) -> Media:
        existing = await self.find_matching(data)
        if existing:
            for field, value in data.model_dump().items():
                if hasattr(existing, field):
                    setattr(existing, field, value)
            await self.db_session.flush()
            return existing

        media = Media(**data.model_dump())
        self.db_session.add(media)
        await self.db_session.flush()
        await self.db_session.refresh(media)
        return media

    async def delete(self, media: Media) -> None:
        await self.db_session.delete(media)
