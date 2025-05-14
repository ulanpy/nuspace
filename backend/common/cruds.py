from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.media import Media


async def get_media_objects(
    object_id: int,
    entity_type: EntityType,
    session: AsyncSession,
) -> list[Media]:
    media_result = await session.execute(
        select(Media).filter(Media.entity_id == object_id, Media.entity_type == entity_type)
    )
    return media_result.scalars().all()
