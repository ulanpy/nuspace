from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import (
    get_creds_or_401,
    get_creds_or_guest,
    get_db_session,
    get_infra,
)
from backend.common.schemas import Infra
from backend.core.database.models.community import (
    Community,
    CommunityCategory,
    CommunityPhotoAlbumType,
    CommunityRecruitmentStatus,
    CommunityType,
)
from backend.core.database.models.user import User
from backend.modules.campuscurrent.communities import dependencies as deps
from backend.modules.campuscurrent.communities import schemas
from backend.modules.campuscurrent.communities.policy import CommunityPolicy
from backend.modules.campuscurrent.communities.service import CommunityService
from backend.common.utils.enums import ResourceAction

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
    community_service = CommunityService(db_session=db_session)
    try:
        return await community_service.create_community(
            infra=infra, community_data=community_data, user=user
        )
    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database integrity error: {str(e.orig)}",
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
    await CommunityPolicy(user=user).check_permission(action=ResourceAction.READ)
    community_service = CommunityService(db_session=db_session)
    return await community_service.list_communities(
        infra=infra,
        user=user,
        page=page,
        size=size,
        community_type=community_type,
        community_category=community_category,
        recruitment_status=recruitment_status,
        head_sub=head_sub,
        keyword=keyword,
    )


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
    await CommunityPolicy(user=user).check_permission(
        action=ResourceAction.READ, community=community
    )
    community_service = CommunityService(db_session=db_session)
    return await community_service.get_community_response(
        infra=infra, community=community, user=user
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
    community_service = CommunityService(db_session=db_session)
    return await community_service.update_community(
        infra=infra, community=community, new_data=new_data, user=user
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
    await CommunityPolicy(user=user).check_permission(
        action=ResourceAction.DELETE, community=community
    )
    community_service = CommunityService(db_session=db_session)
    deleted = await community_service.delete_community(
        infra=infra, community=community, community_id=community_id, user=user
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete community",
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
    community_service = CommunityService(db_session=db_session)
    return await community_service.create_achievement(
        community_id=community_id,
        achievement_data=achievement_data,
        user=user,
    )


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
    community_service = CommunityService(db_session=db_session)
    return await community_service.list_achievements(
        community_id=community_id, size=size, page=page, user=user
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
    await CommunityPolicy(user=user).check_permission(
        action=ResourceAction.UPDATE, community=community
    )
    community_service = CommunityService(db_session=db_session)
    achievement = await community_service.update_achievement(
        community_id=community_id,
        achievement_id=achievement_id,
        achievement_data=achievement_data,
        user=user,
    )
    if achievement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Achievement with id {achievement_id} not found in community {community_id}",
        )
    return achievement


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
    await CommunityPolicy(user=user).check_permission(
        action=ResourceAction.UPDATE, community=community
    )
    community_service = CommunityService(db_session=db_session)
    deleted = await community_service.delete_achievement(
        community_id=community_id,
        achievement_id=achievement_id,
        user=user,
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Achievement with id {achievement_id} not found in community {community_id}",
        )


# ==================== Photo Album Endpoints ====================


@router.post("/communities/{community_id}/albums", response_model=schemas.PhotoAlbumResponse)
async def create_photo_album(
    community_id: int,
    album_data: schemas.PhotoAlbumCreateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
    community: Community = Depends(deps.community_exists_or_404),
) -> schemas.PhotoAlbumResponse:
    """
    Create a new photo album for a community.

    **Access Policy:**
    - User must be the community head (can_edit permission)

    **Parameters:**
    - `community_id`: The ID of the community
    - `album_data`: Album details (album_url, description, album_type)

    **Returns:**
    - Created photo album object

    **Errors:**
    - 403 if user doesn't have permission
    - 404 if community not found
    """
    await CommunityPolicy(user=user).check_permission(
        action=ResourceAction.UPDATE, community=community
    )
    community_service = CommunityService(db_session=db_session)
    return await community_service.create_photo_album(
        community_id=community_id,
        album_data=album_data,
        user=user,
    )


@router.get("/communities/{community_id}/albums", response_model=schemas.ListPhotoAlbums)
async def get_photo_albums(
    community_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    db_session: AsyncSession = Depends(get_db_session),
    community: Community = Depends(deps.community_exists_or_404),
    size: int = Query(20, ge=1, le=100),
    page: int = 1,
    album_type: CommunityPhotoAlbumType | None = None,
) -> schemas.ListPhotoAlbums:
    """
    Get all photo albums for a community.

    **Access Policy:**
    - All users can access

    **Parameters:**
    - `community_id`: The ID of the community
    - `size`: Number of albums per page (default: 20)
    - `page`: Page number (default: 1)
    - `album_type`: Filter by album type (optional)

    **Returns:**
    - List of photo albums ordered by creation date (newest first)
    """
    await CommunityPolicy(user=user).check_permission(
        action=ResourceAction.READ, community=community
    )
    community_service = CommunityService(db_session=db_session)
    return await community_service.list_photo_albums(
        community_id=community_id,
        size=size,
        page=page,
        album_type=album_type,
        user=user,
    )


@router.patch("/communities/{community_id}/albums/{album_id}", response_model=schemas.PhotoAlbumResponse)
async def update_photo_album(
    community_id: int,
    album_id: int,
    album_data: schemas.PhotoAlbumUpdateRequest,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
    community: Community = Depends(deps.community_exists_or_404),
) -> schemas.PhotoAlbumResponse:
    """
    Update a photo album.

    **Access Policy:**
    - User must be the community head (can_edit permission)

    **Parameters:**
    - `community_id`: The ID of the community
    - `album_id`: The ID of the album
    - `album_data`: Updated album data

    **Returns:**
    - Updated photo album object

    **Errors:**
    - 403 if user doesn't have permission
    - 404 if album or community not found
    """
    await CommunityPolicy(user=user).check_permission(
        action=ResourceAction.UPDATE, community=community
    )
    community_service = CommunityService(db_session=db_session)
    album = await community_service.update_photo_album(
        community_id=community_id,
        album_id=album_id,
        album_data=album_data,
        user=user,
    )
    if album is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Photo album with id {album_id} not found in community {community_id}",
        )
    return album


@router.delete("/communities/{community_id}/albums/{album_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo_album(
    community_id: int,
    album_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
    community: Community = Depends(deps.community_exists_or_404),
):
    """
    Delete a photo album.

    **Access Policy:**
    - User must be the community head (can_edit permission)

    **Parameters:**
    - `community_id`: The ID of the community
    - `album_id`: The ID of the album

    **Returns:**
    - 204 No Content on success

    **Errors:**
    - 403 if user doesn't have permission
    - 404 if album or community not found
    """
    await CommunityPolicy(user=user).check_permission(
        action=ResourceAction.UPDATE, community=community
    )
    community_service = CommunityService(db_session=db_session)
    deleted = await community_service.delete_photo_album(
        community_id=community_id,
        album_id=album_id,
        user=user,
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Photo album with id {album_id} not found in community {community_id}",
        )


@router.post("/communities/{community_id}/albums/{album_id}/refresh", response_model=schemas.PhotoAlbumResponse)
async def refresh_photo_album_metadata(
    community_id: int,
    album_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
    community: Community = Depends(deps.community_exists_or_404),
) -> schemas.PhotoAlbumResponse:
    """
    Refresh album metadata from Google Photos.

    **Access Policy:**
    - User must be the community head (can_edit permission)

    **Parameters:**
    - `community_id`: The ID of the community
    - `album_id`: The ID of the album

    **Returns:**
    - Updated photo album object with fresh metadata

    **Errors:**
    - 403 if user doesn't have permission
    - 404 if album or community not found
    """
    await CommunityPolicy(user=user).check_permission(
        action=ResourceAction.UPDATE, community=community
    )
    community_service = CommunityService(db_session=db_session)
    album = await community_service.refresh_photo_album_metadata(
        community_id=community_id,
        album_id=album_id,
        user=user,
    )
    if album is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Photo album with id {album_id} not found in community {community_id}",
        )
    return album


@router.post("/communities/{community_id}/albums/refresh")
async def refresh_all_photo_albums(
    community_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
    community: Community = Depends(deps.community_exists_or_404),
) -> dict:
    """
    Refresh metadata for all photo albums in a community.

    **Access Policy:**
    - User must be the community head (can_edit permission)

    **Parameters:**
    - `community_id`: The ID of the community

    **Returns:**
    - Summary of refresh operation (total, success, error counts)

    **Errors:**
    - 403 if user doesn't have permission
    - 404 if community not found
    """
    await CommunityPolicy(user=user).check_permission(
        action=ResourceAction.UPDATE, community=community
    )
    community_service = CommunityService(db_session=db_session)
    return await community_service.refresh_all_photo_albums(
        community_id=community_id,
        user=user,
    )
