from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_db_session
from backend.common.schemas import MediaResponse, ShortUserResponse
from backend.common.utils import meilisearch, response_builder
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.community import Community, CommunityType
from backend.core.database.models.media import Media, MediaFormat
from backend.routes.communities.communities import policy, schemas
from backend.routes.google_bucket.utils import delete_bucket_object

router = APIRouter(tags=["Community Routes"])


@router.post("/communities", response_model=schemas.CommunityResponse)
async def add_community(
    request: Request,
    community_data: schemas.CommunityRequest,
    user: Annotated[dict, Depends(policy.check_create_permission)],
    db_session: AsyncSession = Depends(get_db_session),
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
    )


@router.get("/communities", response_model=schemas.ListCommunity)
async def get_communities(
    request: Request,
    user: Annotated[dict, Depends(policy.check_read_permission)],
    size: int = Query(20, ge=1, le=100),
    page: int = 1,
    community_type: Optional[CommunityType] = None,
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

    **Returns:**
    - List of communities matching the criteria with pagination info

    **Notes:**
    - Results are ordered by creation date (newest first)
    - Each community includes its associated media in profile format
    """
    # Build conditions list
    conditions = []
    if community_type:
        conditions.append(Community.type == community_type)

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
    new_data: schemas.CommunityUpdate,
    user: Annotated[dict, Depends(policy.check_update_permission)],
    db_session: AsyncSession = Depends(get_db_session),
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

    qb = QueryBuilder(session=db_session, model=Community)
    community: Community | None = (
        await qb.base().filter(Community.id == community_id).eager(Community.head_user).first()
    )

    if community is None:
        raise HTTPException(status_code=404, detail="Community not found")

    qb = QueryBuilder(session=db_session, model=Community)
    community: Community = await qb.update(instance=community, update_data=new_data)

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
    )


@router.delete("/communities/{community_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_community(
    request: Request,
    community_id: int,
    user: Annotated[dict, Depends(policy.require_delete_permission)],
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Deletes a specific community.

    **Access Policy:**
    - The user must be an admin

    **Parameters:**
    - `community_id`: The ID of the community to delete

    **Process:**
    - Deletes the community entry from the database
    - Deletes all related media files from the storage bucket and their DB records
    - Removes the community from the Meilisearch index

    **Returns:**
    - HTTP 204 No Content on successful deletion

    **Errors:**
    - Returns 404 if the community is not found
    - Returns 500 on internal error
    """

    try:
        # Get community with admin check
        community_conditions = [Community.id == community_id]  # Admin check is done via dependency

        qb = QueryBuilder(session=db_session, model=Community)
        community: Community | None = await qb.base().filter(*community_conditions).first()

        if community is None:
            raise HTTPException(status_code=404, detail="Community not found")

        # Get and delete associated media files
        media_conditions = [
            Media.entity_id == community.id,
            Media.entity_type == EntityType.communities,
        ]

        qb = QueryBuilder(session=db_session, model=Media)
        media_objects: List[Media] = await qb.base().filter(*media_conditions).all()

        # Delete media files from storage bucket
        if media_objects:
            for media in media_objects:
                await delete_bucket_object(request, media.name)

        # Delete community from database
        qb = QueryBuilder(session=db_session, model=Community)
        community_deleted: bool = await qb.delete(target=community)
        # Delete associated media records from database
        qb = QueryBuilder(session=db_session, model=Media)
        media_deleted: bool = await qb.delete(target=media_objects)
        if not community_deleted or not media_deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Community not found")

        # Remove from search index
        await meilisearch.delete(
            request=request, storage_name=Community.__tablename__, primary_key=str(community_id)
        )

        return status.HTTP_204_NO_CONTENT

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
