from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_current_principals, get_db_session
from backend.common.schemas import MediaResponse, ShortUserResponse
from backend.common.utils import response_builder
from backend.core.database.models import CommunityPost, Media
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.media import MediaFormat
from backend.routes.communities.posts.dependencies import post_exists_or_404
from backend.routes.communities.posts.policy import PostPolicy, ResourceAction
from backend.routes.communities.posts.schemas import (
    CommunityPostRequestSchema,
    CommunityPostResponse,
    CommunityPostUpdateSchema,
    ListCommunityPostResponseSchema,
)

router = APIRouter(tags=["Community Posts"])


@router.post("/posts", response_model=CommunityPostResponse)
async def create_post(
    request: Request,
    post_data: CommunityPostRequestSchema,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
) -> CommunityPostResponse:
    policy = PostPolicy(db_session)
    await policy.check_permission(action=ResourceAction.CREATE, user=user, post_data=post_data)

    try:
        qb = QueryBuilder(session=db_session, model=CommunityPost)
        post: CommunityPost = await qb.add(
            data=post_data, preload=[CommunityPost.author, CommunityPost.community]
        )
    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database integrity error: {str(e.orig)}",
        )

    # TODO: Add meilisearch indexing if needed for posts

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
    )

    return response_builder.build_schema(
        CommunityPostResponse,
        CommunityPostResponse.model_validate(post),
        author=ShortUserResponse.model_validate(post.author),
        community=post.community,  # Assuming community object is available, adjust if needed
        media=media_results[0] if media_results else [],
    )


@router.get("/posts", response_model=ListCommunityPostResponseSchema)
async def get_posts(
    request: Request,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    community_id: int = Query(...),
    size: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
    db_session: AsyncSession = Depends(get_db_session),
) -> ListCommunityPostResponseSchema:
    policy = PostPolicy(db_session)
    await policy.check_permission(action=ResourceAction.READ, user=user)

    conditions = [CommunityPost.community_id == community_id]

    qb = QueryBuilder(session=db_session, model=CommunityPost)
    posts: List[CommunityPost] = (
        await qb.base()
        .filter(*conditions)
        .eager(CommunityPost.author, CommunityPost.community)  # Eager load author and community
        .paginate(size=size, page=page)
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

    post_responses: List[CommunityPostResponse] = [
        response_builder.build_schema(
            CommunityPostResponse,
            CommunityPostResponse.model_validate(post),
            author=ShortUserResponse.model_validate(post.author),
            community=post.community,
            media=media,
        )
        for post, media in zip(posts, media_results)
    ]

    count: int = await qb.blank().base(count=True).filter(*conditions).count()
    total_pages: int = response_builder.calculate_pages(count=count, size=size)

    return ListCommunityPostResponseSchema(posts=post_responses, total_pages=total_pages)


@router.get("/posts/{post_id}", response_model=CommunityPostResponse)
async def get_post(
    request: Request,
    post_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
    post: CommunityPost = Depends(post_exists_or_404),
) -> CommunityPostResponse:
    policy = PostPolicy(db_session)
    await policy.check_permission(action=ResourceAction.READ, user=user, post=post)

    qb = QueryBuilder(
        session=db_session, model=CommunityPost
    )  # Not strictly needed if post is passed by dependency
    # but good for consistency or further operations

    media_objs: List[Media] = (
        await qb.blank(model=Media)
        .base()
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

    return response_builder.build_schema(
        CommunityPostResponse,
        CommunityPostResponse.model_validate(post),
        author=ShortUserResponse.model_validate(post.author),
        community=post.community,
        media=media_results[0] if media_results else [],
    )


@router.patch("/posts/{post_id}", response_model=CommunityPostResponse)
async def update_post(
    request: Request,
    post_id: int,
    post_data: CommunityPostUpdateSchema,  # Changed to CommunityPostUpdateSchema
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
    post: CommunityPost = Depends(post_exists_or_404),
) -> CommunityPostResponse:
    policy = PostPolicy(db_session)
    await policy.check_permission(
        action=ResourceAction.UPDATE, user=user, post=post, post_data=post_data
    )

    qb = QueryBuilder(session=db_session, model=CommunityPost)
    updated_post: CommunityPost = await qb.update(
        instance=post,
        update_data=post_data,
        preload=[CommunityPost.author, CommunityPost.community],
    )

    # TODO: Update meilisearch indexing if needed

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

    return response_builder.build_schema(
        CommunityPostResponse,
        CommunityPostResponse.model_validate(updated_post),
        author=ShortUserResponse.model_validate(updated_post.author),
        community=updated_post.community,
        media=media_results[0] if media_results else [],
    )


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    request: Request,
    post_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
    post: CommunityPost = Depends(post_exists_or_404),
):
    policy = PostPolicy(db_session)
    await policy.check_permission(action=ResourceAction.DELETE, user=user, post=post)

    qb = QueryBuilder(session=db_session, model=CommunityPost)
    await qb.delete(instance=post)

    # TODO: Delete from meilisearch if needed
    # TODO: Delete associated media from bucket if any (see communities.py example)
    pass
