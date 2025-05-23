from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_db_session
from backend.common.utils import response_builder
from backend.core.database.models.community import CommunityComment
from backend.routes.communities import cruds
from backend.routes.communities.schemas import (
    CommunityCommentRequestSchema,
    CommunityCommentResponseSchema,
    CommunityCommentSchema,
    ListCommunityCommentResponseSchema,
)

router = APIRouter()


@router.get("/posts/comments", response_model=ListCommunityCommentResponseSchema)
async def get(
    post_id: int,
    comment_id: int | None = None,
    size: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
    db_session: AsyncSession = Depends(get_db_session),
) -> ListCommunityCommentResponseSchema:
    qb: QueryBuilder = QueryBuilder(session=db_session, model=CommunityComment)
    comments: List[CommunityComment] = (
        await qb.base()
        .filter(CommunityComment.post_id == post_id, CommunityComment.parent_id == comment_id)
        .paginate(size, page)
        .order(CommunityComment.created_at.desc())
        .all()
    )

    qb: QueryBuilder = QueryBuilder(session=db_session, model=CommunityComment)
    count: int = (
        await qb.base(count=True)
        .filter(CommunityComment.post_id == post_id, CommunityComment.parent_id == comment_id)
        .count()
    )

    num_of_pages: int = response_builder.calculate_pages(count=count, size=size)
    root_comment_ids = [comment.id for comment in comments]
    replies_count_map = await cruds.get_children_counts(
        session=db_session,
        model=CommunityComment,
        parent_field=CommunityComment.parent_id,
        parent_ids=root_comment_ids,
    )

    comments_response: List[CommunityCommentResponseSchema] = [
        CommunityCommentResponseSchema.model_validate(
            {**comment.__dict__, "total_replies": replies_count_map.get(comment.id, 0)}
        )
        for comment in comments
    ]

    return ListCommunityCommentResponseSchema(
        comments=comments_response,
        num_of_pages=num_of_pages,
    )


@router.post("/posts/comments", response_model=CommunityCommentSchema)
async def create(
    comment: CommunityCommentRequestSchema, db_session: AsyncSession = Depends(get_db_session)
) -> CommunityCommentSchema:
    qb: QueryBuilder = QueryBuilder(session=db_session, model=CommunityComment)
    comment: CommunityComment = await qb.add(data=comment)
    return comment


@router.delete("/comments", status_code=status.HTTP_204_NO_CONTENT)
async def delete(comment_id: int, db_session: AsyncSession = Depends(get_db_session)):
    qb = QueryBuilder(session=db_session, model=CommunityComment)
    comment: CommunityComment | None = (
        await qb.base().filter(CommunityComment.id == comment_id).first()
    )

    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")

    await qb.delete(target=comment)
