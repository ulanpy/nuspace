from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_creds_or_401, get_db_session
from backend.core.database.models.community import CommunityComment, CommunityPost
from backend.core.database.models.user import User
from backend.routes.campuscurrent.comments import schemas


async def post_exists_or_404(
    comment_data: schemas.RequestCommunityCommentSchema,
    db_session: AsyncSession = Depends(get_db_session),
) -> CommunityPost:
    """Verify post exists and return it, or raise 404."""
    post_id = comment_data.post_id
    qb = QueryBuilder(session=db_session, model=CommunityPost)
    post = await qb.base().filter(CommunityPost.id == post_id).first()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return post


async def parent_comment_exists_or_404(
    comment_data: schemas.RequestCommunityCommentSchema,
    db_session: AsyncSession = Depends(get_db_session),
) -> CommunityComment | None:
    """
    Verify parent comment exists and belongs to the same post.
    Returns None if no parent_id provided, otherwise returns the parent comment or raises 404/400.
    """
    if comment_data.parent_id is None:
        return None

    qb = QueryBuilder(session=db_session, model=CommunityComment)
    parent_comment = await qb.base().filter(CommunityComment.id == comment_data.parent_id).first()
    if parent_comment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Parent comment not found"
        )
    if parent_comment.post_id != comment_data.post_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parent comment does not belong to the post",
        )
    return parent_comment


async def comment_exists_or_404(
    comment_id: int, db_session: AsyncSession = Depends(get_db_session)
) -> CommunityComment:
    """
    Verify comment exists and belongs to the specified post.
    Raises 404 if comment not found or 400 if comment doesn't belong to post.
    """
    qb = QueryBuilder(session=db_session, model=CommunityComment)
    comment = await qb.base().filter(CommunityComment.id == comment_id).first()
    if comment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    return comment


async def user_exists_or_404(
    comment_data: schemas.RequestCommunityCommentSchema,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
) -> User:
    qb = QueryBuilder(session=db_session, model=User)
    if comment_data.user_sub == "me":
        db_user = await qb.base().filter(User.sub == user[0]["sub"]).first()
    else:
        db_user = await qb.base().filter(User.sub == comment_data.user_sub).first()
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user
