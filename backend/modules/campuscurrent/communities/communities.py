from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import case
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import (
    get_creds_or_401,
    get_creds_or_guest,
    get_db_session,
    get_infra,
)
from backend.common.schemas import Infra, MediaResponse, ShortUserResponse
from backend.common.utils import meilisearch, response_builder
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.community import (
    Community,
    CommunityAchievements,
    CommunityCategory,
    CommunityRecruitmentStatus,
    CommunityType,
)
from backend.core.database.models.media import Media, MediaFormat
from backend.core.database.models.user import User
from backend.modules.campuscurrent.communities import dependencies as deps
from backend.modules.campuscurrent.communities import schemas
from backend.modules.campuscurrent.communities.policy import CommunityPolicy, ResourceAction
from backend.modules.campuscurrent.communities.utils import get_community_permissions
from backend.modules.google_bucket.utils import batch_delete_blobs

router = APIRouter(tags=["Community Routes"])


@router.post("/communities", response_model=schemas.CommunityResponse)
async def add_community(
    request: Request,
    community_data: schemas.CommunityCreateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
    infra: Infra = Depends(get_infra),
    community_head: User = Depends(deps.user_exists_or_404),
) -> schemas.CommunityResponse:
    """
    Create a new community. Any registered user can create communities.

    **Access Policy:**
    - Any registered user can create communities
    - Users can only create communities for themselves (head must be "me" or their own sub)

    **Parameters:**
    - `community_data` (schemas.CommunityRequest): Data for the new community.

    **Returns:**
    - `schemas.CommunityResponse`: Created community with media.

    **Notes:**
    - The community is indexed in Meilisearch after creation.
    - Users can only set themselves as the head of the community.
    """
    await CommunityPolicy(user=user).check_permission(
        action=ResourceAction.CREATE, community_data=community_data
    )

    community_data.head = user[0].get("sub") if community_data.head == "me" else community_data.head

    try:
        qb = QueryBuilder(session=db_session, model=Community)
        community: Community = await qb.add(
            data=community_data, preload=[Community.head_user, Community.achievements]
        )

    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database integrity error: {str(e.orig)}",
        )

    await meilisearch.upsert(
        client=request.app.state.meilisearch_client,
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
            Media.media_format.in_([MediaFormat.profile, MediaFormat.banner]),
        )
        .all()
    )

    media_results: List[List[MediaResponse]] = await response_builder.map_media_to_resources(
        infra=infra, media_objects=media_objs, resources=[community]
    )

    return response_builder.build_schema(
        schemas.CommunityResponse,
        schemas.CommunityResponse.model_validate(community),
        head_user=ShortUserResponse.model_validate(community.head_user),
        media=media_results[0],
        permissions=get_community_permissions(community, user),
    )


# add keyword search
@router.get("/communities", response_model=schemas.ListCommunity)
async def get_communities(
    request: Request,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
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
    infra: Infra = Depends(get_infra),
    keyword: str | None = Query(
        default=None, description="Search keyword for community name or description"
    ),
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
    - `keyword`: Search keyword for community name or description (optional)

    **Returns:**
    - List of communities matching the criteria with pagination info

    **Notes:**
    - If head_sub is 'me', the current user's sub will be used
    - Results are ordered by creation date (newest first)
    - Each community includes its associated media in profile format
    """
    # unregistered users can read communities
    policy = CommunityPolicy(user=user)
    await policy.check_permission(action=ResourceAction.READ)
    # Build conditions list
    conditions = []

    head_sub = user[0].get("sub") if head_sub == "me" else head_sub

    if keyword:
        meili_result = await meilisearch.get(
            client=request.app.state.meilisearch_client,
            storage_name=EntityType.communities.value,
            keyword=keyword,
            page=page,
            size=size,
            filters=None,
        )
        community_ids = [item["id"] for item in meili_result["hits"]]

        if not community_ids:
            return schemas.ListCommunity(communities=[], total_pages=1)

    if community_type:
        conditions.append(Community.type == community_type)
    if community_category:
        conditions.append(Community.category == community_category)
    if recruitment_status:
        conditions.append(Community.recruitment_status == recruitment_status)
    if head_sub:
        conditions.append(Community.head == head_sub)
    if keyword:
        conditions.append(Community.id.in_(community_ids))

    qb = QueryBuilder(session=db_session, model=Community)

    if keyword:
        # Preserve Meilisearch ranking order by using a custom order

        order_clause = case(
            *[
                (Community.id == community_id, index)
                for index, community_id in enumerate(community_ids)
            ],
            else_=len(community_ids),
        )
        communities: List[Community] = (
            await qb.base()
            .filter(*conditions)
            .eager(Community.head_user, Community.achievements)
            .order(order_clause)
            .all()
        )
    else:
        # Alphabetical order when no keyword
        communities: List[Community] = (
            await qb.base()
            .filter(*conditions)
            .eager(Community.head_user, Community.achievements)
            .paginate(size, page)
            .order(Community.name.asc())
            .all()
        )

    media_objs: List[Media] = (
        await qb.blank(model=Media)
        .base()
        .filter(
            Media.entity_id.in_([community.id for community in communities]),
            Media.entity_type == EntityType.communities,
            Media.media_format.in_([MediaFormat.profile, MediaFormat.banner]),
        )
        .all()
    )

    media_results: List[List[MediaResponse]] = await response_builder.map_media_to_resources(
        infra=infra, media_objects=media_objs, resources=communities
    )

    if keyword:
        count = meili_result.get("estimatedTotalHits", 0)
    else:
        count: int = await qb.blank(model=Community).base(count=True).filter(*conditions).count()

    community_responses: List[schemas.CommunityResponse] = [
        response_builder.build_schema(
            schemas.CommunityResponse,
            schemas.CommunityResponse.model_validate(community),
            media=media,
            permissions=get_community_permissions(community, user),
        )
        for community, media in zip(communities, media_results)
    ]

    total_pages: int = response_builder.calculate_pages(count=count, size=size)
    return schemas.ListCommunity(communities=community_responses, total_pages=total_pages)


@router.get("/communities/{community_id}", response_model=schemas.CommunityResponse)
async def get_community(
    request: Request,
    community_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    db_session: AsyncSession = Depends(get_db_session),
    infra: Infra = Depends(get_infra),
    community: Community = Depends(deps.community_exists_or_404),
) -> schemas.CommunityResponse:
    """
    Retrieves a specific community by ID.

    **Access Policy:**
    - All authenticated users can access this endpoint

    **Parameters:**
    - `community_id`: The unique identifier of the community to retrieve

    **Returns:**
    - A detailed community object if found, including its name, description,
    head user details, and media URLs

    **Errors:**
    - Returns 404 if community is not found
    - Returns 500 on internal error
    """
    # Create policy and check permissions
    await CommunityPolicy(user=user).check_permission(
        action=ResourceAction.READ, community=community
    )

    # Get associated media
    qb = QueryBuilder(session=db_session, model=Community)
    # Eagerly load achievements to avoid lazy loading issues
    await qb.session.refresh(community, ["achievements"])
    media_objs: List[Media] = (
        await qb.blank(model=Media)
        .base()
        .filter(
            Media.entity_id == community.id,
            Media.entity_type == EntityType.communities,
            Media.media_format.in_([MediaFormat.profile, MediaFormat.banner]),
        )
        .all()
    )
    media_results: List[List[MediaResponse]] = await response_builder.map_media_to_resources(
        infra=infra, media_objects=media_objs, resources=[community]
    )

    return response_builder.build_schema(
        schemas.CommunityResponse,
        schemas.CommunityResponse.model_validate(community),
        head_user=ShortUserResponse.model_validate(community.head_user),
        media=media_results[0],
        permissions=get_community_permissions(community, user),
    )


@router.patch("/communities/{community_id}", response_model=schemas.CommunityResponse)
async def update_community(
    request: Request,
    community_id: int,
    new_data: schemas.CommunityUpdateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
    infra: Infra = Depends(get_infra),
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
        instance=community,
        update_data=new_data,
        preload=[Community.head_user, Community.achievements],
    )

    # Update Meilisearch index
    await meilisearch.upsert(
        client=request.app.state.meilisearch_client,
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
            Media.media_format.in_([MediaFormat.profile, MediaFormat.banner]),
        )
        .all()
    )

    media_results: List[List[MediaResponse]] = await response_builder.map_media_to_resources(
        infra=infra, media_objects=media_objs, resources=[community]
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
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
    infra: Infra = Depends(get_infra),
    community: Community = Depends(deps.community_exists_or_404),
):
    """
    Deletes a specific community.

    **Access Policy:**
    - The user must be an admin

    **Parameters:**
    - `community_id`: The ID of the community to delete

    **Process:**
    - Deletes all media files (community) from storage
    - Deletes the community entry from the database
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

    qb = QueryBuilder(session=db_session, model=Community)

    # 4. Handle community media
    community_media_objects: List[Media] = await (
        qb.blank(model=Media)
        .base()
        .filter(Media.entity_id == community_id, Media.entity_type == EntityType.communities)
        .all()
    )
    await batch_delete_blobs(
        request.app.state.storage_client,
        request.app.state.config,
        media_objects=community_media_objects,
    )
    await qb.blank(Media).delete(target=community_media_objects)
    # 5. Delete the community itself
    await qb.blank(Community).delete(target=community)

    # 6. Clean up search index
    await meilisearch.delete(
        client=infra.meilisearch_client,
        storage_name=Community.__tablename__,
        primary_key=str(community_id),
    )


# ==================== Achievement Endpoints ====================


@router.post("/communities/{community_id}/achievements", response_model=schemas.AchievementResponse)
async def create_achievement(
    community_id: int,
    achievement_data: schemas.AchievementCreateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
    community: Community = Depends(deps.community_exists_or_404),
) -> schemas.AchievementResponse:
    """
    Create a new achievement for a community.

    **Access Policy:**
    - User must be the community head (can_edit permission)

    **Parameters:**
    - `community_id`: The ID of the community
    - `achievement_data`: Achievement details (description, year)

    **Returns:**
    - Created achievement object

    **Errors:**
    - 403 if user doesn't have permission
    - 404 if community not found
    """
    await CommunityPolicy(user=user).check_permission(
        action=ResourceAction.UPDATE, community=community
    )

    # Override community_id from URL
    achievement_data.community_id = community_id

    qb = QueryBuilder(session=db_session, model=CommunityAchievements)
    achievement: CommunityAchievements = await qb.add(data=achievement_data)

    return schemas.AchievementResponse.model_validate(achievement)


@router.get("/communities/{community_id}/achievements", response_model=schemas.ListAchievements)
async def get_achievements(
    community_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    db_session: AsyncSession = Depends(get_db_session),
    community: Community = Depends(deps.community_exists_or_404),
    size: int = Query(100, ge=1, le=200),
    page: int = 1,
) -> schemas.ListAchievements:
    """
    Get all achievements for a community.

    **Access Policy:**
    - All users can access

    **Parameters:**
    - `community_id`: The ID of the community
    - `size`: Number of achievements per page
    - `page`: Page number

    **Returns:**
    - List of achievements ordered by year (descending)
    """
    await CommunityPolicy(user=user).check_permission(
        action=ResourceAction.READ, community=community
    )

    qb = QueryBuilder(session=db_session, model=CommunityAchievements)
    achievements: List[CommunityAchievements] = (
        await qb.base()
        .filter(CommunityAchievements.community_id == community_id)
        .order(CommunityAchievements.year.desc())
        .paginate(size, page)
        .all()
    )

    count: int = (
        await qb.blank(model=CommunityAchievements)
        .base(count=True)
        .filter(CommunityAchievements.community_id == community_id)
        .count()
    )

    achievement_responses = [
        schemas.AchievementResponse.model_validate(achievement)
        for achievement in achievements
    ]

    total_pages = response_builder.calculate_pages(count=count, size=size)
    return schemas.ListAchievements(
        achievements=achievement_responses,
        total_pages=total_pages,
    )


@router.patch("/communities/{community_id}/achievements/{achievement_id}", response_model=schemas.AchievementResponse)
async def update_achievement(
    community_id: int,
    achievement_id: int,
    achievement_data: schemas.AchievementUpdateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
    community: Community = Depends(deps.community_exists_or_404),
) -> schemas.AchievementResponse:
    """
    Update an achievement.

    **Access Policy:**
    - User must be the community head (can_edit permission)

    **Parameters:**
    - `community_id`: The ID of the community
    - `achievement_id`: The ID of the achievement
    - `achievement_data`: Updated achievement data

    **Returns:**
    - Updated achievement object

    **Errors:**
    - 403 if user doesn't have permission
    - 404 if achievement or community not found
    """
    qb = QueryBuilder(session=db_session, model=CommunityAchievements)
    achievement: CommunityAchievements | None = (
        await qb.base()
        .filter(
            CommunityAchievements.id == achievement_id,
            CommunityAchievements.community_id == community_id,
        )
        .first()
    )

    if achievement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Achievement with id {achievement_id} not found in community {community_id}",
        )

    await CommunityPolicy(user=user).check_permission(
        action=ResourceAction.UPDATE, community=community
    )

    achievement = await qb.update(instance=achievement, update_data=achievement_data)

    return schemas.AchievementResponse.model_validate(achievement)


@router.delete("/communities/{community_id}/achievements/{achievement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_achievement(
    community_id: int,
    achievement_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
    community: Community = Depends(deps.community_exists_or_404),
):
    """
    Delete an achievement.

    **Access Policy:**
    - User must be the community head (can_edit permission)

    **Parameters:**
    - `community_id`: The ID of the community
    - `achievement_id`: The ID of the achievement

    **Returns:**
    - 204 No Content on success

    **Errors:**
    - 403 if user doesn't have permission
    - 404 if achievement or community not found
    """
    qb = QueryBuilder(session=db_session, model=CommunityAchievements)
    achievement: CommunityAchievements | None = (
        await qb.base()
        .filter(
            CommunityAchievements.id == achievement_id,
            CommunityAchievements.community_id == community_id,
        )
        .first()
    )

    if achievement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Achievement with id {achievement_id} not found in community {community_id}",
        )

    await CommunityPolicy(user=user).check_permission(
        action=ResourceAction.UPDATE, community=community
    )

    await qb.delete(target=achievement)
