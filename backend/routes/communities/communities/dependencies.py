from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_current_principals, get_db_session
from backend.core.database.models.community import Community
from backend.core.database.models.user import User
from backend.routes.communities.communities import schemas


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


async def user_exists_or_404(
    community_data: schemas.CommunityCreateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
) -> User:
    qb = QueryBuilder(session=db_session, model=User)
    if community_data.head == "me":
        db_user = await qb.base().filter(User.sub == user[0]["sub"]).first()
    else:
        db_user = await qb.base().filter(User.sub == community_data.head).first()
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user
