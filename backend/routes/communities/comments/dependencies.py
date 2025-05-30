from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_db_session
from backend.core.database.models.community import CommunityComment, CommunityPost
from backend.routes.communities.comments.schemas import RequestCommunityCommentSchema


async def post_exists_or_404(
    post_id: int, db_session: AsyncSession = Depends(get_db_session)
) -> CommunityPost:
    qb = QueryBuilder(session=db_session, model=CommunityPost)
    post = await qb.base().filter(CommunityPost.id == post_id).first()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return post


async def parent_comment_exists_or_404(
    comment_data: RequestCommunityCommentSchema,
    post_id: int,
    db_session: AsyncSession = Depends(get_db_session),
) -> CommunityComment | None:
    if comment_data.parent_id is None:
        return None

    qb = QueryBuilder(session=db_session, model=CommunityComment)
    parent_comment = await qb.base().filter(CommunityComment.id == comment_data.parent_id).first()
    if parent_comment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Parent comment not found"
        )
    if parent_comment.post_id != post_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parent comment does not belong to the post",
        )
    return parent_comment


async def comment_exists_or_404(
    comment_id: int, post_id: int, db_session: AsyncSession = Depends(get_db_session)
) -> CommunityComment:
    qb = QueryBuilder(session=db_session, model=CommunityComment)
    comment = await qb.base().filter(CommunityComment.id == comment_id).first()
    if comment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    if comment.post_id != post_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Comment does not belong to the specified post",
        )
    return comment
