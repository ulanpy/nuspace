from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import check_role, check_token, get_db_session
from backend.common.schemas import MediaResponse
from backend.common.utils import meilisearch, response_builder
from backend.core.database.models.club import Club, ClubType
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.media import Media, MediaFormat
from backend.core.database.models.user import UserRole
from backend.routes.clubs import utils
from backend.routes.clubs.schemas import (
    ClubRequestSchema,
    ClubResponseSchema,
    ClubUpdateSchema,
    ListClubSchema,
)
from backend.routes.google_bucket.utils import delete_bucket_object

router = APIRouter(tags=["Club Routes"])


@router.post("/clubs", response_model=ClubResponseSchema)
async def add_club(
    request: Request,
    club_data: ClubRequestSchema,
    user: Annotated[dict, Depends(check_token)],
    role: Annotated[bool, Depends(check_role)],
    db_session: AsyncSession = Depends(get_db_session),
) -> ClubResponseSchema:
    """
    Create a new club. Requires admin privileges.

    **Requirements:**
    - The user must be authenticated (`access_token` cookie required).
    - The user must have admin privileges (checked via dependency).

    **Parameters:**
    - `club_data` (ClubRequestSchema): Data for the new club.

    **Returns:**
    - `ClubResponseSchema`: Created club with media.

    **Notes:**
    - If admin privileges are not present, the request will fail with 403.
    - The club is indexed in Meilisearch after creation.
    """

    if role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No permissions")

    try:
        qb = QueryBuilder(session=db_session, model=Club)
        club: Club = await qb.add(data=club_data)

    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database integrity error: {str(e.orig)}",
        )

    await meilisearch.upsert(
        request=request,
        storage_name=Club.__tablename__,
        json_values={
            "id": club.id,
            "name": club.name,
            "description": club.description,
        },
    )

    conditions = [
        Media.entity_id == club.id,
        Media.entity_type == EntityType.clubs,
        Media.media_format == MediaFormat.carousel,
    ]

    qb = QueryBuilder(session=db_session, model=Media)
    media_objects: List[Media] = await qb.base().filter(*conditions).all()

    media_responses: List[MediaResponse] = await response_builder.build_media_responses(
        request=request, media_objects=media_objects
    )

    return utils.build_club_response(club=club, media_responses=media_responses)


@router.get("/clubs", response_model=ListClubSchema)
async def get_clubs(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    size: int = Query(20, ge=1, le=100),
    page: int = 1,
    club_type: Optional[ClubType] = None,
    db_session: AsyncSession = Depends(get_db_session),
) -> ListClubSchema:
    """
    Retrieves a paginated list of clubs with flexible filtering.

    **Parameters:**
    - `size`: Number of clubs per page (default: 20)
    - `page`: Page number (default: 1)
    - `club_type`: Filter by club type (optional)

    **Returns:**
    - List of clubs matching the criteria with pagination info

    **Notes:**
    - Results are ordered by creation date (newest first)
    - Each club includes its associated media in profile format
    """
    try:
        # Build conditions list
        conditions = []
        if club_type:
            conditions.append(Club.type == club_type)

        qb = QueryBuilder(session=db_session, model=Club)
        clubs: List[Club] = (
            await qb.base()
            .filter(*conditions)
            .paginate(size=size, page=page)
            .order(Club.created_at.desc())
            .all()
        )

        # Build responses with media
        clubs_responses: List[ClubResponseSchema] = await response_builder.build_responses(
            request=request,
            items=clubs,
            session=db_session,
            media_format=MediaFormat.profile,
            entity_type=EntityType.clubs,
            response_builder=utils.build_club_response,
        )
        qb = QueryBuilder(session=db_session, model=Club)
        count = await qb.base(count=True).filter(*conditions).count()
        num_of_pages: int = response_builder.calculate_pages(count=count, size=size)

        return ListClubSchema(clubs=clubs_responses, num_of_pages=num_of_pages)

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.patch("/clubs", response_model=ClubResponseSchema)
async def update_club(
    request: Request,
    new_data: ClubUpdateSchema,
    user: Annotated[dict, Depends(check_token)],
    role: Annotated[bool, Depends(check_role)],
    db_session: AsyncSession = Depends(get_db_session),
) -> ClubResponseSchema:
    """
    Updates fields of an existing club. Requires admin privileges.

    **Requirements:**
    - The user must be authenticated (`access_token` cookie required)
    - The user must have admin privileges (checked via dependency)

    **Parameters:**
    - `new_data`: Updated club data including club_id, name, description, type, etc.

    **Returns:**
    - Updated club with all its details and media

    **Errors:**
    - Returns 404 if club is not found
    - Returns 500 on internal error
    """
    if role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No permissions")

    try:
        # Get club with admin check
        conditions = []  # No additional conditions since admin check is done via dependency
        qb = QueryBuilder(session=db_session, model=Club)
        club: Club | None = await qb.base().filter(Club.id == new_data.club_id, *conditions).first()

        if club is None:
            raise HTTPException(status_code=404, detail="Club not found")

        qb = QueryBuilder(session=db_session, model=Club)
        updated_club: Club = await qb.update(instance=club, update_data=new_data)

        # Update Meilisearch index
        await meilisearch.upsert(
            request=request,
            storage_name=Club.__tablename__,
            json_values={
                "id": updated_club.id,
                "name": updated_club.name,
                "description": updated_club.description,
            },
        )

        # Get associated media
        conditions = [
            Media.entity_id == updated_club.id,
            Media.entity_type == EntityType.clubs,
            Media.media_format == MediaFormat.profile,
        ]

        qb = QueryBuilder(session=db_session, model=Media)
        media_objects: List[Media] = await qb.base().filter(*conditions).all()

        media_responses: List[MediaResponse] = await response_builder.build_media_responses(
            request=request, media_objects=media_objects
        )

        return utils.build_club_response(club=updated_club, media_responses=media_responses)

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete("/clubs", status_code=status.HTTP_204_NO_CONTENT)
async def delete_club(
    request: Request,
    club_id: int,
    user: Annotated[dict, Depends(check_token)],
    role: Annotated[bool, Depends(check_role)],
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Deletes a specific club. Requires admin privileges.

    **Requirements:**
    - The user must be authenticated (`access_token` cookie required)
    - The user must have admin privileges (checked via dependency)

    **Parameters:**
    - `club_id`: The ID of the club to delete

    **Process:**
    - Deletes the club entry from the database
    - Deletes all related media files from the storage bucket and their DB records
    - Removes the club from the Meilisearch index

    **Returns:**
    - HTTP 204 No Content on successful deletion

    **Errors:**
    - Returns 404 if the club is not found
    - Returns 500 on internal error
    """

    if role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No permissions")

    try:
        # Get club with admin check
        club_conditions = [Club.id == club_id]  # Admin check is done via dependency

        qb = QueryBuilder(session=db_session, model=Club)
        club: Club | None = await qb.base().filter(*club_conditions).first()

        if club is None:
            raise HTTPException(status_code=404, detail="Club not found")

        # Get and delete associated media files
        media_conditions = [Media.entity_id == club.id, Media.entity_type == EntityType.clubs]

        qb = QueryBuilder(session=db_session, model=Media)
        media_objects: List[Media] = await qb.base().filter(*media_conditions).all()

        # Delete media files from storage bucket
        if media_objects:
            for media in media_objects:
                await delete_bucket_object(request, media.name)

        # Delete club from database
        qb = QueryBuilder(session=db_session, model=Club)
        club_deleted: bool = await qb.delete(target=club)

        # Delete associated media records from database
        qb = QueryBuilder(session=db_session, model=Media)
        media_deleted: bool = await qb.delete(target=media_objects)

        if not club_deleted or not media_deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

        # Remove from search index
        await meilisearch.delete(
            request=request, storage_name=Club.__tablename__, primary_key=str(club_id)
        )

        return status.HTTP_204_NO_CONTENT

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
