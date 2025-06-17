from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_db_session
from backend.core.database.models import CommunityPostTag


async def tag_exists_or_404(
    tag_id: int, db_session: AsyncSession = Depends(get_db_session)
) -> CommunityPostTag:
    """
    Verify tag exists and return it, or raise 404.

    Args:
        tag_id: The ID of the tag to check
        db_session: The database session

    Returns:
        CommunityPostTag: The tag if it exists

    Raises:
        HTTPException: 404 if tag not found
    """
    qb = QueryBuilder(session=db_session, model=CommunityPostTag)
    tag = await qb.base().filter(CommunityPostTag.id == tag_id).first()
    if tag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    return tag
