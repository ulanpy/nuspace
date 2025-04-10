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
    created_media = []

    try:
        try:
            section = MediaSection(confirmation.section)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid media section: {confirmation.section}")

        try:
            media_purpose = MediaPurpose(confirmation.media_purpose)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid media purpose: {confirmation.media_purpose}")

        media_record = Media(
            name=confirmation.filename,
            mime_type=confirmation.mime_type,
            section=section,
            entity_id=confirmation.entity_id,
            media_purpose=media_purpose,
            media_order=0
        )
        session.add(media_record)
        created_media.append(media_record)

        await session.commit()
        return created_media

    except SQLAlchemyError as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Database error while confirming uploads: {str(e)}")


async def delete_media(session: AsyncSession, media_id: int):
    result = await session.execute(select(Media).filter_by(id=media_id))
    result = result.scalars().first()
    if result:
        await session.delete(result)
        await session.commit()
        return True
    else:
        return False