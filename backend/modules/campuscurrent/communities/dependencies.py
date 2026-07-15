from typing import Annotated, List

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.common.dependencies import get_creds_or_401, get_db_session
from backend.core.database.models.community import Community
from backend.core.database.models.user import User
from backend.modules.campuscurrent.communities import schemas


async def community_exists_or_404(
    community_id: int,
    db_session: AsyncSession = Depends(get_db_session),
) -> Community:
    stmt = (
        select(Community)
        .where(Community.id == community_id)
        .options(selectinload(Community.head_user))
    )
    result = await db_session.execute(stmt)
    community = result.scalars().first()
    if community is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Community not found")
    return community


async def user_exists_or_404(
    community_data: schemas.CommunityCreateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
) -> User:
    sub = user[0]["sub"] if community_data.head == "me" else community_data.head
    stmt = select(User).where(User.sub == sub)
    result = await db_session.execute(stmt)
    db_user = result.scalars().first()
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user
