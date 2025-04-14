from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select, func
from fastapi import HTTPException
from backend.core.database.models.media import Media, MediaSection, MediaPurpose
from .schemas import UploadConfirmation
from typing import List


async def confirm_uploaded_media_to_db(
    confirmation: UploadConfirmation,
    session: AsyncSession
) -> List[Media]:
    try:
        section = MediaSection(confirmation.section)
        media_purpose = MediaPurpose(confirmation.media_purpose)

        # Check if it already exists (based on unique constraints)
        stmt = select(Media).where(
            Media.name == confirmation.filename,
            Media.section == section,
            Media.entity_id == confirmation.entity_id,
            Media.media_purpose == media_purpose,
        )
        result = await session.execute(stmt)
        media_record = result.scalar_one_or_none()

        if media_record:
            # 🔄 Update existing record
            media_record.name = confirmation.filename
            media_record.mime_type = confirmation.mime_type
            media_record.media_order = confirmation.media_order
            media_record.section = confirmation.section
            media_record.entity_id = confirmation.entity_id
            media_record.media_purpose = confirmation.media_purpose
            media_record.media_order = confirmation.media_order
        else:
            # ➕ Create new record
            media_record = Media(
                name=confirmation.filename,
                mime_type=confirmation.mime_type,
                section=section,
                entity_id=confirmation.entity_id,
                media_purpose=media_purpose,
                media_order=confirmation.media_order,
            )
            session.add(media_record)

        await session.commit()
        return [media_record]

    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database error while confirming uploads: {str(e)}")

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