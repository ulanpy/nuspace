from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database.models.media import Media, MediaTable


async def get_media_objects(
    object_id: int,
    media_table: MediaTable,
    session: AsyncSession,
) -> list[Media]:
    media_result = await session.execute(
        select(Media).filter(Media.entity_id == object_id, Media.media_table == media_table)
    )
    return media_result.scalars().all()
