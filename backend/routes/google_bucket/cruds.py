from typing import List

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.media import Media, MediaFormat

from .schemas import UploadConfirmation


# idenpotence + upsert
async def confirm_uploaded_media_to_db(
    confirmation: UploadConfirmation, session: AsyncSession
) -> List[Media]:
    try:
        entity_type = EntityType(confirmation.entity_type)
        media_format = MediaFormat(confirmation.media_format)

        # Check if it already exists (based on unique constraints)
        stmt = select(Media).where(
            Media.name == confirmation.filename,
            Media.entity_type == entity_type,
            Media.entity_id == confirmation.entity_id,
            Media.media_format == media_format,
        )
        result = await session.execute(stmt)
        media_record = result.scalar_one_or_none()

        if media_record:
            # 🔄 Update existing record
            media_record.name = confirmation.filename
            media_record.mime_type = confirmation.mime_type
            media_record.media_order = confirmation.media_order
            media_record.entity_type = confirmation.entity_type
            media_record.entity_id = confirmation.entity_id
            media_record.media_format = confirmation.media_format
            media_record.media_order = confirmation.media_order
        else:
            # ➕ Create new record
            media_record = Media(
                name=confirmation.filename,
                mime_type=confirmation.mime_type,
                entity_type=entity_type,
                entity_id=confirmation.entity_id,
                media_format=media_format,
                media_order=confirmation.media_order,
            )
            session.add(media_record)

        await session.commit()
        return [media_record]

    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(
            status_code=500, detail=f"Database error while confirming uploads: {str(e)}"
        )


async def delete_media(session: AsyncSession, media_id: int):
    result = await session.execute(select(Media).filter_by(id=int(media_id)))
    result = result.scalars().first()
    if result:
        await session.delete(result)
        await session.commit()
        return True
    else:
        return False


async def get_filename(session: AsyncSession, media_id: int):
    result = await session.execute(select(Media.name).filter_by(id=int(media_id)))
    result = result.scalars().first()
    return result
