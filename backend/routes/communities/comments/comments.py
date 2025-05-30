import asyncio
from typing import Annotated, List

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_current_principals, get_db_session
from backend.common.schemas import MediaResponse
from backend.common.utils import response_builder
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.community import CommunityComment
from backend.core.database.models.media import Media
from backend.routes.communities.comments import cruds, utils
from backend.routes.communities.comments.dependencies import (
    check_create_permission,
    check_delete_permission,
    check_read_permission,
)
from backend.routes.communities.comments.schemas import (
    ListCommunityCommentResponseSchema,
    RequestCommunityCommentSchema,
    ResponseCommunityCommentSchema,
)

router = APIRouter(tags=["Community Posts Comments Routes"])


@router.get("/posts/comments", response_model=ListCommunityCommentResponseSchema)
async def get(
    request: Request,
    user: Annotated[dict, Depends(get_current_principals)],
    policy: Annotated[dict, Depends(check_read_permission)],
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

    count: int = (
        await qb.blank()
        .base(count=True)
        .filter(CommunityComment.post_id == post_id, CommunityComment.parent_id == comment_id)
        .count()
    )
    total_pages: int = response_builder.calculate_pages(count=count, size=size)

    comment_ids: List[int] = [comment.id for comment in comments]
    replies_counter: dict[int, int] = await cruds.get_replies_counts(
        session=db_session,
        model=CommunityComment,
        parent_field=CommunityComment.parent_id,
        parent_ids=comment_ids,
    )

    media_objs: List[Media] = (
        await qb.blank(model=Media)
        .base()
        .filter(
            Media.entity_id.in_(comment_ids),
            Media.entity_type == EntityType.community_comments,
        )
        .all()
    )

    media_results: List[List[MediaResponse]] = await asyncio.gather(
        *[
            response_builder.build_media_responses(
                request=request,
                media_objects=[media for media in media_objs if media.entity_id == comment.id],
            )
            for comment in comments
        ]
    )

    comments_response: List[ResponseCommunityCommentSchema] = [
        utils.build_schema(
            ResponseCommunityCommentSchema,
            ResponseCommunityCommentSchema.model_validate(comment),
            total_replies=replies_counter.get(comment.id, 0),
            media=media,
        )
        for comment, media in zip(comments, media_results)
    ]

    return ListCommunityCommentResponseSchema(
        comments=comments_response,
        total_pages=total_pages,
    )


@router.post("/posts/comments", response_model=ResponseCommunityCommentSchema)
async def create(
    request: Request,
    comment: RequestCommunityCommentSchema,
    user: Annotated[dict, Depends(get_current_principals)],
    policy: Annotated[dict, Depends(check_create_permission)],
    db_session: AsyncSession = Depends(get_db_session),
) -> ResponseCommunityCommentSchema:
    qb: QueryBuilder = QueryBuilder(session=db_session, model=CommunityComment)
    comment: CommunityComment = await qb.blank().add(data=comment)

    media_objs: List[Media] = (
        await qb.blank(model=Media)
        .base()
        .filter(Media.entity_id == comment.id, Media.entity_type == EntityType.community_comments)
        .all()
    )
    media_responses: List[MediaResponse] = await response_builder.build_media_responses(
        request=request, media_objects=media_objs
    )

    replies_counter: int = (
        await cruds.get_replies_counts(
            session=db_session,
            model=CommunityComment,
            parent_field=CommunityComment.parent_id,
            parent_ids=[comment.id],
        )
    ).get(comment.id, 0)

    comment_response: ResponseCommunityCommentSchema = utils.build_schema(
        ResponseCommunityCommentSchema,
        ResponseCommunityCommentSchema.model_validate(comment),
        total_replies=replies_counter,
        media=media_responses,
    )
    return comment_response


@router.delete("/comments", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    comment_id: int,
    user: Annotated[dict, Depends(get_current_principals)],
    policy: Annotated[dict, Depends(check_delete_permission)],
    db_session: AsyncSession = Depends(get_db_session),
):
    qb = QueryBuilder(session=db_session, model=CommunityComment)
    comment: CommunityComment | None = (
        await qb.base().filter(CommunityComment.id == comment_id).first()
    )

    await qb.delete(target=comment)
