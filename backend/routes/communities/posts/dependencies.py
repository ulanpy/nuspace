from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_db_session
from backend.core.database.models import CommunityPost


async def post_exists_or_404(
    post_id: int, db_session: AsyncSession = Depends(get_db_session)
) -> CommunityPost:
    qb = QueryBuilder(session=db_session, model=CommunityPost)
    post = await qb.base().filter(CommunityPost.id == post_id).first()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return post
