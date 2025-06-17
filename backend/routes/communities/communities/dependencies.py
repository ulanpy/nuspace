from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_db_session
from backend.core.database.models.community import Community


async def community_exists_or_404(
    community_id: int,
    db_session: AsyncSession = Depends(get_db_session),
) -> Community:
    qb = QueryBuilder(session=db_session, model=Community)
    community = (
        await qb.base().filter(Community.id == community_id).eager(Community.head_user).first()
    )
    if community is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Community not found")
    return community
