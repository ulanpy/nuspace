from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_current_principals, get_db_session
from backend.core.database.models import Community, CommunityPost, CommunityPostTag
from backend.core.database.models.user import User
from backend.routes.campuscurrent.posts import schemas


async def post_exists_or_404(
    post_id: int, db_session: AsyncSession = Depends(get_db_session)
) -> CommunityPost:
    qb = QueryBuilder(session=db_session, model=CommunityPost)
    post = await (
        qb.base()
        .filter(CommunityPost.id == post_id)
        .eager(CommunityPost.user, CommunityPost.tag, CommunityPost.community)
        .first()
    )
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return post


async def community_exists_or_404(
    post_data: schemas.CommunityPostRequest, db_session: AsyncSession = Depends(get_db_session)
) -> Community:
    qb = QueryBuilder(session=db_session, model=Community)
    community = await qb.base().filter(Community.id == post_data.community_id).first()
    if community is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Community not found")
    return community


async def user_exists_or_404(
    post_data: schemas.CommunityPostRequest,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
) -> User:
    qb = QueryBuilder(session=db_session, model=User)
    if post_data.user_sub == "me":
        db_user = await qb.base().filter(User.sub == user[0]["sub"]).first()
    else:
        db_user = await qb.base().filter(User.sub == post_data.user_sub).first()
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user


async def tag_exists_or_404(
    post_data: schemas.CommunityPostRequest | schemas.CommunityPostUpdate,
    db_session: AsyncSession = Depends(get_db_session),
) -> CommunityPostTag:
    qb = QueryBuilder(session=db_session, model=CommunityPostTag)

    if post_data.tag_id is None:
        return None

    tag = await qb.base().filter(CommunityPostTag.id == post_data.tag_id).first()
    if tag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    return tag
