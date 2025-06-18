from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_current_principals, get_db_session
from backend.common.schemas import MediaResponse, ShortUserResponse
from backend.common.utils import meilisearch, response_builder
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.community import (
    Community,
    CommunityCategory,
    CommunityComment,
    CommunityPost,
    CommunityRecruitmentStatus,
    CommunityType,
)
from backend.core.database.models.media import Media, MediaFormat
from backend.core.database.models.user import User
from backend.routes.communities.communities import dependencies as deps
from backend.routes.communities.communities import schemas
from backend.routes.communities.communities.policy import CommunityPolicy, ResourceAction
from backend.routes.communities.communities.utils import get_community_permissions
from backend.routes.google_bucket.utils import batch_delete_blobs

router = APIRouter(tags=["Community Routes"])


@router.post("/communities", response_model=schemas.CommunityResponse)
async def add_community(
    request: Request,
    community_data: schemas.CommunityCreateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
    community_head: User = Depends(deps.user_exists_or_404),
) -> schemas.CommunityResponse:
    """
    Create a new community. Requires admin privileges.

    **Access Policy:**
    - The user must have admin privileges

    **Parameters:**
    - `community_data` (schemas.CommunityRequest): Data for the new community.

    **Returns:**
    - `schemas.CommunityResponse`: Created community with media.

    **Notes:**
    - If admin privileges are not present, the request will fail with 403.
    - The club is indexed in Meilisearch after creation.
    """
    await CommunityPolicy(user=user).check_permission(
        action=ResourceAction.CREATE, community_data=community_data
    )

    community_data.head = user[0].get("sub") if community_data.head == "me" else community_data.head

    try:
        qb = QueryBuilder(session=db_session, model=Community)
        community: Community = await qb.add(data=community_data, preload=[Community.head_user])

    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database integrity error: {str(e.orig)}",
        )

    await meilisearch.upsert(
        request=request,
        storage_name=Community.__tablename__,
        json_values={
            "id": community.id,
            "name": community.name,
            "description": community.description,
        },
    )

    media_objs: List[Media] = (
        await qb.blank(model=Media)
        .base()
        .filter(
            Media.entity_id == community.id,
            Media.entity_type == EntityType.communities,
            Media.media_format == MediaFormat.profile,
        )
        .all()
    )

    media_results: List[List[MediaResponse]] = await response_builder.map_media_to_resources(
        request=request, media_objects=media_objs, resources=[community]
    )

    return response_builder.build_schema(
        schemas.CommunityResponse,
        schemas.CommunityResponse.model_validate(community),
        head_user=ShortUserResponse.model_validate(community.head_user),
        media=media_results[0],
        permissions=get_community_permissions(community, user),
    )


@router.get("/communities", response_model=schemas.ListCommunity)
async def get_communities(
    request: Request,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    size: int = Query(20, ge=1, le=100),
    page: int = 1,
    community_type: CommunityType | None = None,
    community_category: CommunityCategory | None = None,
    recruitment_status: CommunityRecruitmentStatus | None = None,
    head_sub: str | None = Query(
        default=None,
        description=("if 'me' then current user's sub will be used"),
    ),
    db_session: AsyncSession = Depends(get_db_session),
) -> schemas.ListCommunity:
    """
    Retrieves a paginated list of communities with flexible filtering.

    **Access Policy:**
    - All users can access this endpoint

    **Parameters:**
    - `size`: Number of communities per page (default: 20)
    - `page`: Page number (default: 1)
    - `community_type`: Filter by community type (optional)
    - `community_category`: Filter by community category (optional)
    - `recruitment_status`: Filter by recruitment status (optional)
    - `head_sub`: Filter by head sub (optional)

    **Returns:**
    - List of communities matching the criteria with pagination info

    **Notes:**
    - If head_sub is 'me', the current user's sub will be used
    - Results are ordered by creation date (newest first)
    - Each community includes its associated media in profile format
    """
    policy = CommunityPolicy(user=user)
    await policy.check_permission(action=ResourceAction.READ)
    # Build conditions list
    conditions = []

    head_sub = user[0].get("sub") if head_sub == "me" else head_sub

    if community_type:
        conditions.append(Community.type == community_type)
    if community_category:
        conditions.append(Community.category == community_category)
    if recruitment_status:
        conditions.append(Community.recruitment_status == recruitment_status)
    if head_sub:
        conditions.append(Community.head == head_sub)

    qb = QueryBuilder(session=db_session, model=Community)
    communities: List[Community] = (
        await qb.base()
        .filter(*conditions)
        .eager(Community.head_user)
        .paginate(size=size, page=page)
        .order(Community.created_at.desc())
        .all()
    )

    media_objs: List[Media] = (
        await qb.blank(model=Media)
        .base()
        .filter(
            Media.entity_id.in_([community.id for community in communities]),
            Media.entity_type == EntityType.communities,
            Media.media_format == MediaFormat.carousel,
        )
        .all()
    )

    media_results: List[List[MediaResponse]] = await response_builder.map_media_to_resources(
        request=request, media_objects=media_objs, resources=communities
    )

    community_responses: List[schemas.CommunityResponse] = [
        response_builder.build_schema(
            schemas.CommunityResponse,
            schemas.CommunityResponse.model_validate(community),
            media=media,
            permissions=get_community_permissions(community, user),
        )
        for community, media in zip(communities, media_results)
    ]
    count: int = await qb.blank().base(count=True).filter(*conditions).count()
    total_pages: int = response_builder.calculate_pages(count=count, size=size)
    return schemas.ListCommunity(communities=community_responses, total_pages=total_pages)


@router.patch("/communities/{community_id}", response_model=schemas.CommunityResponse)
async def update_community(
    request: Request,
    community_id: int,
    new_data: schemas.CommunityUpdateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
    community: Community = Depends(deps.community_exists_or_404),
) -> schemas.CommunityResponse:
    """
    Updates fields of an existing community.

    **Access Policy:**
    - The user must be the head of the community or an admin

    **Parameters:**
    - `new_data`: Updated community data including community_id, name, description, type, etc.

    **Returns:**
    - Updated community with all its details and media

    **Errors:**
    - Returns 404 if community is not found
    - Returns 403 if user is not the head of the community and is not an admin
    - Returns 500 on internal error
    """
    await CommunityPolicy(user=user).check_permission(
        action=ResourceAction.UPDATE, community=community, community_data=new_data
    )

    qb = QueryBuilder(session=db_session, model=Community)
    community: Community = await qb.update(
        instance=community, update_data=new_data, preload=[Community.head_user]
    )

    # Update Meilisearch index
    await meilisearch.upsert(
        request=request,
        storage_name=Community.__tablename__,
        json_values={
            "id": community.id,
            "name": community.name,
            "description": community.description,
        },
    )

    media_objs: List[Media] = (
        await qb.blank(model=Media)
        .base()
        .filter(
            Media.entity_id == community.id,
            Media.entity_type == EntityType.communities,
            Media.media_format == MediaFormat.profile,
        )
        .all()
    )

    media_results: List[List[MediaResponse]] = await response_builder.map_media_to_resources(
        request=request, media_objects=media_objs, resources=[community]
    )

    return response_builder.build_schema(
        schemas.CommunityResponse,
        schemas.CommunityResponse.model_validate(community),
        head_user=ShortUserResponse.model_validate(community.head_user),
        media=media_results[0],
        permissions=get_community_permissions(community, user),
    )


@router.delete("/communities/{community_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_community(
    request: Request,
    community_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
    community: Community = Depends(deps.community_exists_or_404),
):
    """
    Deletes a specific community.

    **Access Policy:**
    - The user must be an admin

    **Parameters:**
    - `community_id`: The ID of the community to delete

    **Process:**
    - Deletes all media files (community, posts, comments) from storage
    - Deletes the community entry from the database (cascades to posts, comments)
    - Removes the community from the Meilisearch index

    **Returns:**
    - HTTP 204 No Content on successful deletion

    **Errors:**
    - Returns 404 if the community is not found
    - Returns 500 on internal error
    """
    # Check permissions
    await CommunityPolicy(user=user).check_permission(
        action=ResourceAction.DELETE, community=community
    )

    # Initialize query builder
    qb = QueryBuilder(session=db_session, model=CommunityPost)

    # 1. Get all posts in the community
    post_ids: List[int] = await (
        qb.base()
        .filter(CommunityPost.community_id == community_id)
        .attributes(CommunityPost.id)
        .all()
    )

    # 2. Handle comments and their media
    if post_ids:
        # Get all comments
        comment_ids: List[int] = await (
            qb.blank(model=CommunityComment)
            .base()
            .attributes(CommunityComment.id)
            .filter(CommunityComment.post_id.in_(post_ids))
            .all()
        )

        # Get and delete comment media
        comment_media_objects: List[Media] = await (
            qb.blank(model=Media)
            .base()
            .filter(
                Media.entity_id.in_(comment_ids), Media.entity_type == EntityType.community_comments
            )
            .all()
        )
        await batch_delete_blobs(request, media_objects=comment_media_objects)
        await qb.blank(Media).delete(target=comment_media_objects)

    # 3. Handle post media
    post_media_objects: List[Media] = await (
        qb.blank(model=Media)
        .base()
        .filter(Media.entity_id.in_(post_ids), Media.entity_type == EntityType.community_posts)
        .all()
    )
    await batch_delete_blobs(request, media_objects=post_media_objects)
    await qb.blank(Media).delete(target=post_media_objects)
    # 4. Handle community media
    community_media_objects: List[Media] = await (
        qb.blank(model=Media)
        .base()
        .filter(Media.entity_id == community_id, Media.entity_type == EntityType.communities)
        .all()
    )
    await batch_delete_blobs(request, media_objects=community_media_objects)
    await qb.blank(Media).delete(target=community_media_objects)
    # 5. Delete the community itself
    await qb.blank(Community).delete(target=community)

    # 6. Clean up search index
    await meilisearch.delete(
        request=request, storage_name=Community.__tablename__, primary_key=str(community_id)
    )
