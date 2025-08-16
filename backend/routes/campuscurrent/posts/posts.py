from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app_state.meilisearch import meilisearch
from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_current_principals, get_db_session, get_optional_principals
from backend.common.schemas import MediaResponse, ShortUserResponse
from backend.common.utils import response_builder
from backend.core.database.models import Community, CommunityPost, CommunityPostTag, Media
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.community import CommunityComment
from backend.core.database.models.media import MediaFormat
from backend.core.database.models.user import User
from backend.routes.campuscurrent.communities.schemas import ShortCommunityResponse
from backend.routes.campuscurrent.posts import cruds
from backend.routes.campuscurrent.posts import dependencies as deps
from backend.routes.campuscurrent.posts.policy import PostPolicy, ResourceAction
from backend.routes.campuscurrent.posts.schemas import (
    CommunityPostRequest,
    CommunityPostResponse,
    CommunityPostUpdate,
    ListCommunityPostResponse,
)
from backend.routes.campuscurrent.posts.utils import get_post_permissions
from backend.routes.campuscurrent.tags.schemas import ShortCommunityTag
from backend.routes.google_bucket.utils import batch_delete_blobs

router = APIRouter(tags=["Community Posts"])


@router.post("/posts", response_model=CommunityPostResponse)
async def create_post(
    request: Request,
    post_data: CommunityPostRequest,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
    community: Community = Depends(deps.community_exists_or_404),
    post_user: User = Depends(deps.user_exists_or_404),
    tag: CommunityPostTag | None = Depends(deps.tag_exists_or_404),
) -> CommunityPostResponse:
    await PostPolicy(user=user).check_permission(action=ResourceAction.CREATE, post_data=post_data)

    if post_data.user_sub == "me":
        post_data.user_sub = user[0].get("sub")

    try:
        qb = QueryBuilder(session=db_session, model=CommunityPost)
        post: CommunityPost = await qb.add(
            data=post_data, preload=[CommunityPost.user, CommunityPost.tag, CommunityPost.community]
        )
    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database integrity error: {str(e.orig)}",
        )

    await meilisearch.upsert(
        request=request,
        storage_name=CommunityPost.__tablename__,
        json_values={"id": post.id, "title": post.title, "description": post.description},
    )

    media_objs: List[Media] = (
        await qb.blank(model=Media)
        .base()
        .filter(
            Media.entity_id == post.id,
            Media.entity_type == EntityType.community_posts,
            Media.media_format
            == MediaFormat.carousel,  # Assuming carousel for posts, adjust if needed
        )
        .all()
    )
    media_results: List[List[MediaResponse]] = await response_builder.map_media_to_resources(
        request=request, media_objects=media_objs, resources=[post]
    )  # one to one mapping

    community_media_objs: List[Media] = (
        await qb.blank(model=Media)
        .base()
        .filter(
            Media.entity_id == post.community_id,
            Media.entity_type == EntityType.communities,
            Media.media_format.in_([MediaFormat.profile, MediaFormat.banner]),
        )
        .all()
    )

    community_media_results: List[List[MediaResponse]] = (
        await response_builder.map_media_to_resources(
            request=request, media_objects=community_media_objs, resources=[post.community]
        )
    )

    total_comments: int = await (
        qb.blank(CommunityComment)
        .base(count=True)
        .filter(CommunityComment.post_id == post.id)
        .count()
    )

    return response_builder.build_schema(
        CommunityPostResponse,
        CommunityPostResponse.model_validate(post),
        user=ShortUserResponse.model_validate(post.user),
        media=media_results[0],
        community=(
            response_builder.build_schema(
                ShortCommunityResponse,
                ShortCommunityResponse.model_validate(post.community),
                media=community_media_results[0] if community_media_results else [],
            )
            if post.community
            else None
        ),
        total_comments=total_comments,
        tag=ShortCommunityTag.model_validate(post.tag) if post.tag else None,
        permissions=get_post_permissions(post, user),
    )


# TODO: refactor based on communities router where keyword search ranking is preserved
@router.get("/posts", response_model=ListCommunityPostResponse)
async def get_posts(
    request: Request,
    user: Annotated[tuple[dict, dict], Depends(get_optional_principals)],
    community_id: int | None = None,
    size: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
    db_session: AsyncSession = Depends(get_db_session),
    keyword: str | None = None,
) -> ListCommunityPostResponse:
    await PostPolicy(user=user).check_permission(action=ResourceAction.READ)

    conditions = []
    if community_id:
        conditions.append(CommunityPost.community_id == community_id)

    if keyword:
        meili_result = await meilisearch.get(
            request=request,
            storage_name=EntityType.community_posts.value,
            keyword=keyword,
            page=page,
            size=size,  # limit max returned IDs, adjust as needed
            filters=None,
        )
        post_ids = [item["id"] for item in meili_result["hits"]]

        if not post_ids:
            return ListCommunityPostResponse(posts=[], total_pages=1)

        conditions.append(CommunityPost.id.in_(post_ids))

    qb = QueryBuilder(session=db_session, model=CommunityPost)
    if keyword:
        # Preserve Meilisearch ranking order by using a custom order
        from sqlalchemy import case

        order_clause = case(
            *[(CommunityPost.id == post_id, index) for index, post_id in enumerate(post_ids)],
            else_=len(post_ids),
        )
        posts: List[CommunityPost] = (
            await qb.base()
            .filter(*conditions)
            .order(order_clause)
            .eager(CommunityPost.user, CommunityPost.tag, CommunityPost.community)
            .all()
        )
    else:
        # Alphabetical order when no keyword
        posts: List[CommunityPost] = (
            await qb.base()
            .filter(*conditions)
            .paginate(size, page)
            .eager(CommunityPost.user, CommunityPost.tag, CommunityPost.community)
            .order(CommunityPost.created_at.desc())
            .all()
        )

    media_objs: List[Media] = (
        await qb.blank(model=Media)
        .base()
        .filter(
            Media.entity_id.in_([post.id for post in posts]),
            Media.entity_type == EntityType.community_posts,
            Media.media_format == MediaFormat.carousel,  # Assuming carousel for posts
        )
        .all()
    )

    media_results: List[List[MediaResponse]] = await response_builder.map_media_to_resources(
        request=request, media_objects=media_objs, resources=posts
    )

    # Get community media for all posts
    community_ids = [post.community_id for post in posts if post.community_id]
    community_media_objs: List[Media] = []
    if community_ids:
        community_media_objs = (
            await qb.blank(model=Media)
            .base()
            .filter(
                Media.entity_id.in_(community_ids),
                Media.entity_type == EntityType.communities,
                Media.media_format.in_([MediaFormat.profile, MediaFormat.banner]),
            )
            .all()
        )

    # Get comment counts for each post using a dictionary
    post_responses: List[CommunityPostResponse] = []
    for post, media in zip(posts, media_results):
        # Get community media for this specific event
        community_media = (
            [m for m in community_media_objs if m.entity_id == post.community_id]
            if post.community_id
            else []
        )

        community_media_responses = await response_builder.build_media_responses(
            request=request, media_objects=community_media
        )

        comments_count: dict = await cruds.get_comment_counts(db_session, posts)

        post_responses.append(
            response_builder.build_schema(
                CommunityPostResponse,
                CommunityPostResponse.model_validate(post),
                media=media,
                community=(
                    response_builder.build_schema(
                        ShortCommunityResponse,
                        ShortCommunityResponse.model_validate(post.community),
                        media=community_media_responses,
                    )
                    if post.community
                    else None
                ),
                user=ShortUserResponse.model_validate(post.user),
                total_comments=comments_count.get(post.id, 0),
                tag=ShortCommunityTag.model_validate(post.tag) if post.tag else None,
                permissions=get_post_permissions(post, user),
            )
        )

    if keyword:
        count = meili_result.get("estimatedTotalHits", 0)
    else:
        count: int = (
            await qb.blank(model=CommunityPost).base(count=True).filter(*conditions).count()
        )

    total_pages: int = response_builder.calculate_pages(count=count, size=size)

    return ListCommunityPostResponse(posts=post_responses, total_pages=total_pages)


@router.get("/posts/{post_id}", response_model=CommunityPostResponse)
async def get_post(
    request: Request,
    post_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_optional_principals)],
    db_session: AsyncSession = Depends(get_db_session),
    post: CommunityPost = Depends(deps.post_exists_or_404),
) -> CommunityPostResponse:
    await PostPolicy(user=user).check_permission(action=ResourceAction.READ, post=post)

    qb = QueryBuilder(session=db_session, model=Media)

    media_objs: List[Media] = (
        await qb.base()
        .filter(
            Media.entity_id == post.id,
            Media.entity_type == EntityType.community_posts,
            Media.media_format == MediaFormat.carousel,  # Assuming carousel for posts
        )
        .all()
    )
    media_results: List[List[MediaResponse]] = await response_builder.map_media_to_resources(
        request=request, media_objects=media_objs, resources=[post]
    )

    community_media_objs: List[Media] = (
        await qb.blank(model=Media)
        .base()
        .filter(
            Media.entity_id == post.community_id,
            Media.entity_type == EntityType.communities,
            Media.media_format.in_([MediaFormat.profile, MediaFormat.banner]),
        )
        .all()
    )

    community_media_results: List[List[MediaResponse]] = (
        await response_builder.map_media_to_resources(
            request=request, media_objects=community_media_objs, resources=[post.community]
        )
    )

    total_comments: int = await (
        qb.blank(CommunityComment)
        .base(count=True)
        .filter(CommunityComment.post_id == post.id)
        .count()
    )

    return response_builder.build_schema(
        CommunityPostResponse,
        CommunityPostResponse.model_validate(post),
        user=ShortUserResponse.model_validate(post.user),
        community=(
            response_builder.build_schema(
                ShortCommunityResponse,
                ShortCommunityResponse.model_validate(post.community),
                media=community_media_results[0] if community_media_results else [],
            )
            if post.community
            else None
        ),
        media=media_results[0] if media_results else [],
        total_comments=total_comments,
        tag=ShortCommunityTag.model_validate(post.tag) if post.tag else None,
        permissions=get_post_permissions(post, user),
    )


@router.patch("/posts/{post_id}", response_model=CommunityPostResponse)
async def update_post(
    request: Request,
    post_id: int,
    post_data: CommunityPostUpdate,  # Changed to CommunityPostUpdate
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
    post: CommunityPost = Depends(deps.post_exists_or_404),
    tag: CommunityPostTag | None = Depends(deps.tag_exists_or_404),
) -> CommunityPostResponse:
    await PostPolicy(user=user).check_permission(
        action=ResourceAction.UPDATE, post=post, post_data=post_data
    )

    qb = QueryBuilder(session=db_session, model=CommunityPost)
    updated_post: CommunityPost = await qb.blank(CommunityPost).update(
        instance=post,
        update_data=post_data,
        preload=[CommunityPost.user],
    )

    await meilisearch.upsert(
        request=request,
        storage_name=CommunityPost.__tablename__,
        json_values={
            "id": updated_post.id,
            "title": updated_post.title,
            "description": updated_post.description,
        },
    )

    media_objs: List[Media] = (
        await qb.blank(model=Media)
        .base()
        .filter(
            Media.entity_id == updated_post.id,
            Media.entity_type == EntityType.community_posts,
            Media.media_format == MediaFormat.carousel,  # Assuming carousel
        )
        .all()
    )
    media_results: List[List[MediaResponse]] = await response_builder.map_media_to_resources(
        request=request, media_objects=media_objs, resources=[updated_post]
    )

    community_media_objs: List[Media] = (
        await qb.blank(model=Media)
        .base()
        .filter(
            Media.entity_id == updated_post.community_id,
            Media.entity_type == EntityType.communities,
            Media.media_format.in_([MediaFormat.profile, MediaFormat.banner]),
        )
        .all()
    )

    community_media_results: List[List[MediaResponse]] = (
        await response_builder.map_media_to_resources(
            request=request, media_objects=community_media_objs, resources=[updated_post.community]
        )
    )
    total_comments: int = await (
        qb.blank(CommunityComment)
        .base(count=True)
        .filter(CommunityComment.post_id == updated_post.id)
        .count()
    )

    return response_builder.build_schema(
        CommunityPostResponse,
        CommunityPostResponse.model_validate(updated_post),
        user=ShortUserResponse.model_validate(updated_post.user),
        media=media_results[0] if media_results else [],
        community=(
            response_builder.build_schema(
                ShortCommunityResponse,
                ShortCommunityResponse.model_validate(updated_post.community),
                media=community_media_results[0] if community_media_results else [],
            )
            if updated_post.community
            else None
        ),
        total_comments=total_comments,
        tag=ShortCommunityTag.model_validate(updated_post.tag) if updated_post.tag else None,
        permissions=get_post_permissions(updated_post, user),
    )


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    request: Request,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
    post: CommunityPost = Depends(deps.post_exists_or_404),
):
    """
    Delete a specific post and its associated resources.

    **Process:**
    - Deletes all media files (post and comments) from storage
    - Deletes the post and its comments from the database
    - Removes the post from the Meilisearch index
    """
    # Check permissions
    await PostPolicy(user=user).check_permission(action=ResourceAction.DELETE, post=post)

    # Initialize query builder
    qb = QueryBuilder(session=db_session, model=CommunityComment)

    # 1. Get all comments for this post
    comments: List[CommunityComment] = await (
        qb.base().filter(CommunityComment.post_id == post.id).all()
    )
    comment_ids = [comment.id for comment in comments]

    # 2. Handle comments and their media
    if comment_ids:
        comment_media_objects: List[Media] = await (
            qb.blank(model=Media)
            .base()
            .filter(
                Media.entity_id.in_(comment_ids), Media.entity_type == EntityType.community_comments
            )
            .all()
        )
        await batch_delete_blobs(request, media_objects=comment_media_objects)
        await qb.blank(CommunityComment).delete(target=comments)

    # 3. Handle post media
    post_media_objects: List[Media] = await (
        qb.blank(model=Media)
        .base()
        .filter(Media.entity_id == post.id, Media.entity_type == EntityType.community_posts)
        .all()
    )
    await batch_delete_blobs(request, media_objects=post_media_objects)

    # 4. Delete the post itself
    await qb.blank(CommunityPost).delete(target=post)

    # 5. Clean up search index
    await meilisearch.delete(
        request=request, storage_name=CommunityPost.__tablename__, primary_key=str(post.id)
    )
