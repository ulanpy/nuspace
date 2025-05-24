from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import check_token, get_db_session
from backend.common.schemas import MediaResponse
from backend.common.utils import response_builder
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.community import CommunityComment
from backend.core.database.models.media import Media, MediaFormat
from backend.routes.communities.comments import cruds, utils
from backend.routes.communities.comments.dependencies import check_comment_ownership, verify_comment
from backend.routes.communities.comments.schemas import (
    CommunityCommentRequestSchema,
    CommunityCommentResponseSchema,
    CommunityCommentSchema,
    ListCommunityCommentResponseSchema,
)

router = APIRouter(tags=["Community Posts Comments Routes"])


@router.get("/posts/comments", response_model=ListCommunityCommentResponseSchema)
async def get(
    request: Request,
    post_id: int,
    user: Annotated[dict, Depends(check_token)],
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

    count: int = (
        await qb.blank()
        .base(count=True)
        .filter(CommunityComment.post_id == post_id, CommunityComment.parent_id == comment_id)
        .count()
    )
    num_of_pages: int = response_builder.calculate_pages(count=count, size=size)

    root_comment_ids: List[int] = [comment.id for comment in comments]
    replies_counter: dict[int, int] = await cruds.get_replies_counts(
        session=db_session,
        model=CommunityComment,
        parent_field=CommunityComment.parent_id,
        parent_ids=root_comment_ids,
    )

    comments_pre_response: List[CommunityCommentSchema] = await response_builder.build_responses(
        request=request,
        items=comments,
        session=db_session,
        media_format=MediaFormat.carousel,
        entity_type=EntityType.community_comments,
        response_builder=utils.build_comment_response,
    )

    comments_response: List[CommunityCommentResponseSchema] = [
        CommunityCommentResponseSchema(
            **comment.model_dump(), total_replies=replies_counter.get(comment.id, 0)
        )
        for comment in comments_pre_response
    ]

    return ListCommunityCommentResponseSchema(
        comments=comments_response,
        num_of_pages=num_of_pages,
    )


@router.post("/posts/comments", response_model=CommunityCommentResponseSchema)
async def create(
    request: Request,
    comment: CommunityCommentRequestSchema,
    user: Annotated[dict, Depends(check_token)],
    permissions: Annotated[bool, Depends(verify_comment)],
    db_session: AsyncSession = Depends(get_db_session),
) -> CommunityCommentResponseSchema:
    qb: QueryBuilder = QueryBuilder(session=db_session, model=CommunityComment)
    if comment.parent_id is not None:
        parent_comment: CommunityComment | None = (
            await qb.base().filter(CommunityComment.id == comment.parent_id).first()
        )

        if parent_comment is None:
            raise HTTPException(status_code=404, detail="Parent comment not found")

        if parent_comment.post_id != comment.post_id:
            raise HTTPException(
                status_code=400, detail="Parent comment does not belong to the post"
            )

    try:
        comment: CommunityComment = await qb.blank().add(data=comment)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="Possibly non-existing post id")

    media: List[Media] = (
        await qb.blank(model=Media)
        .base()
        .filter(Media.entity_id == comment.id, Media.entity_type == EntityType.community_comments)
        .all()
    )
    media_responses: List[MediaResponse] = await response_builder.build_media_responses(
        request=request, media_objects=media
    )
    replies_counter: int = (
        await cruds.get_replies_counts(
            session=db_session,
            model=CommunityComment,
            parent_field=CommunityComment.parent_id,
            parent_ids=[comment.id],
        )
    ).get(comment.id, 0)

    comment_response: CommunityCommentResponseSchema = utils.build_comment_response(
        comment=comment, total_replies=replies_counter, media=media_responses
    )
    return comment_response


@router.delete("/comments", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    comment_id: int,
    user: Annotated[dict, Depends(check_token)],
    permissions: Annotated[bool, Depends(check_comment_ownership)],
    db_session: AsyncSession = Depends(get_db_session),
):
    qb = QueryBuilder(session=db_session, model=CommunityComment)
    comment: CommunityComment | None = (
        await qb.base().filter(CommunityComment.id == comment_id).first()
    )

    await qb.conditional_delete(conditions=(CommunityComment.parent_id == comment_id))
    await qb.delete(target=comment)
