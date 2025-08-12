from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_db_session
from backend.core.database.models import Community, CommunityPostTag
from backend.routes.campuscurrent.tags.schemas import CommunityTagRequest
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession


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


async def community_exists_or_404(
    tag_data: CommunityTagRequest, db_session: AsyncSession = Depends(get_db_session)
) -> Community:
    qb = QueryBuilder(session=db_session, model=Community)
    community = await qb.base().filter(Community.id == tag_data.community_id).first()
    if community is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Community not found")
    return community
