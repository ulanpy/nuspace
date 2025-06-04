import asyncio
from copy import deepcopy
from datetime import datetime
from typing import Annotated, List

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_current_principals, get_db_session
from backend.common.schemas import MediaResponse
from backend.common.utils import response_builder
from backend.common.utils.enums import ResourceAction
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.community import CommunityComment, CommunityPost
from backend.core.database.models.media import Media
from backend.routes.communities.comments import cruds, utils
from backend.routes.communities.comments.dependencies import (
    comment_exists_or_404,
    parent_comment_exists_or_404,
    post_exists_or_404,
)
from backend.routes.communities.comments.policy import CommentPolicy
from backend.routes.communities.comments.schemas import (
    ListCommunityCommentResponseSchema,
    RequestCommunityCommentSchema,
    ResponseCommunityCommentSchema,
    UpdateCommunityCommentSchema,
)

router = APIRouter(tags=["Community Posts Comments Routes"])


@router.get("/comments", response_model=ListCommunityCommentResponseSchema)
async def get(
    request: Request,
    user: Annotated[dict, Depends(get_current_principals)],
    post_id: int,
    comment_id: int | None = None,
    size: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
    db_session: AsyncSession = Depends(get_db_session),
    include_deleted: bool | None = Query(
        False, description="Include deleted comments in the response"
    ),
) -> ListCommunityCommentResponseSchema:
    """
    Retrieve paginated comments for a specific post.

    **Access Policy:**
    - All authenticated users can read comments
    - No special permissions required beyond authentication

    **Parameters:**
    - `post_id` (int): ID of the post to get comments for

    - `comment_id` (int, optional): If provided, returns replies to this comment instead of root
       comments

    - `size` (int): Number of comments per page (min: 1, max: 100, default: 20)

    - `page` (int): Page number (min: 1, default: 1)

    - `include_deleted` (bool, optional): If True, include deleted comments in the response

    **Returns:**
    - comments: List of comments with their media attachments and reply counts
    - total_pages: Total number of pages available

    Each comment includes:
    - Basic comment information (id, content, created_at, etc.)
    - Media attachments if any
    - Total number of replies
    """

    policy = CommentPolicy(db_session)
    await policy.check_permission(
        action=ResourceAction.READ,
        user=user,
        include_deleted=include_deleted,
    )

    qb: QueryBuilder = QueryBuilder(session=db_session, model=CommunityComment)
    comments: List[CommunityComment] = (
        await qb.base()
        .filter(CommunityComment.post_id == post_id, CommunityComment.parent_id == comment_id)
        .eager(CommunityComment.user)
        .paginate(size, page)
        .order(CommunityComment.created_at.desc())
        .all()
    )

    # Transform deleted comments to hide sensitive data
    if not include_deleted:
        for i, comment in enumerate(comments):
            if comment.deleted_at is not None:
                safe_comment = deepcopy(comment)
                safe_comment.user_sub = None
                safe_comment.content = None
                safe_comment.user = None
                comments[i] = safe_comment

    count: int = (
        await qb.blank()
        .base(count=True)
        .filter(CommunityComment.post_id == post_id, CommunityComment.parent_id == comment_id)
        .count()
    )
    total_pages: int = response_builder.calculate_pages(count=count, size=size)

    root_comment_ids: List[int] = [comment.id for comment in comments]
    replies_counter: dict[int, int] = await cruds.get_replies_counts(
        session=db_session,
        model=CommunityComment,
        parent_field=CommunityComment.parent_id,
        parent_ids=root_comment_ids,
    )

    media_objs: List[Media] = (
        await qb.blank(model=Media)
        .base()
        .filter(
            Media.entity_id.in_(root_comment_ids),
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
            user=comment.user,
            permissions=utils.get_comment_permissions(comment, user),
        )
        for comment, media in zip(comments, media_results)
    ]

    return ListCommunityCommentResponseSchema(
        comments=comments_response,
        total_pages=total_pages,
    )


@router.post("/comments", response_model=ResponseCommunityCommentSchema)
async def create_comment(
    request: Request,
    comment_data: RequestCommunityCommentSchema,
    user: Annotated[dict, Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
    post: CommunityPost = Depends(post_exists_or_404),
    parent_comment: CommunityComment | None = Depends(parent_comment_exists_or_404),
) -> ResponseCommunityCommentSchema:
    """
    Create a new comment for a post or reply to an existing comment.

    **Access Policy:**
    - All authenticated users can create comments
    - Users can only create comments as themselves (cannot impersonate other users)
    - Admin can create comments as any user

    **Parameters:**
    - `post_id` (int): ID of the post to comment on

    - `comment_data` (RequestCommunityCommentSchema):

        - `content`: Comment text

        - `parent_id` (optional): ID of the parent comment if this is a reply

        - `media_ids` (optional): List of media attachment IDs

    **Returns:**
    - Created comment with all details including media attachments

    **Errors:**
    - 404: If post not found or parent comment not found (when replying)
    - 400: If parent comment belongs to different post
    - 403: If trying to comment as another user

    **Note:**
    - `user_sub` can be `me` to indicate the authenticated user
    """
    # Check permissions
    policy = CommentPolicy(db_session)
    await policy.check_permission(
        action=ResourceAction.CREATE,
        user=user,
        comment_data=comment_data,
    )

    if comment_data.user_sub == "me":
        comment_data.user_sub = user[0].get("sub")

    # Create the comment
    qb: QueryBuilder = QueryBuilder(session=db_session, model=CommunityComment)
    comment: CommunityComment = await qb.add(data=comment_data, preload=[CommunityComment.user])

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
        user=comment.user,
        permissions=utils.get_comment_permissions(comment, user),
    )
    return comment_response


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    comment_id: int,
    user: Annotated[dict, Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
    comment: CommunityComment = Depends(comment_exists_or_404),
):
    """
    Soft delete a specific comment.

    **Access Policy:**
    - Comment owners can soft delete their own comments
    - Admin can soft delete any comment
    - Soft deleting a parent comment will not delete its replies

    **Parameters:**
    - `post_id` (int): ID of the post containing the comment

    - `comment_id` (int): ID of the comment to soft delete

    **Returns:**
    - 204 No Content on successful soft deletion

    **Errors:**
    - 404: If comment not found or belongs to different post
    - 403: If user is not the comment owner or admin
    """

    policy = CommentPolicy(db_session)
    await policy.check_permission(action=ResourceAction.DELETE, user=user, comment_data=comment)

    # Soft delete the comment
    qb: QueryBuilder = QueryBuilder(session=db_session, model=CommunityComment)
    update_data = UpdateCommunityCommentSchema(deleted_at=datetime.now())
    await qb.update(instance=comment, update_data=update_data)
