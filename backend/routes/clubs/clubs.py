from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common import cruds as common_cruds
from backend.common.dependencies import check_admin, check_token, get_db_session
from backend.common.schemas import MediaResponse
from backend.common.utils import meilisearch, response_builder
from backend.core.database.models.club import Club, ClubEvent, ClubType, EventPolicy
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.media import Media, MediaFormat
from backend.routes.clubs import utils
from backend.routes.clubs.enums import OrderEvents
from backend.routes.clubs.schemas import (
    ClubEventRequestSchema,
    ClubEventResponseSchema,
    ClubEventUpdateSchema,
    ClubRequestSchema,
    ClubResponseSchema,
    ClubUpdateSchema,
    ListClubSchema,
    ListEventSchema,
)
from backend.routes.google_bucket.utils import delete_bucket_object

router = APIRouter(tags=["Club Routes"])


@router.post("/clubs", response_model=ClubResponseSchema)
async def add_club(
    request: Request,
    club_data: ClubRequestSchema,
    user: Annotated[dict, Depends(check_token)],
    admin: Annotated[bool, Depends(check_admin)],
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
    try:
        club: Club = await common_cruds.add_resource(
            session=db_session, model=Club, data=club_data, preload_relationships=[]
        )

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

    media_objects: List[Media] = await common_cruds.get_resources(
        session=db_session, model=Media, conditions=conditions
    )

    media_responses: List[MediaResponse] = await response_builder.build_media_responses(
        request=request, media_objects=media_objects
    )

    return await utils.build_club_response(club=club, media_responses=media_responses)


@router.get("/clubs", response_model=ListClubSchema)
async def get_clubs(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    size: int = 20,
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

        # Get clubs with conditions
        clubs: List[Club] = await common_cruds.get_resources(
            session=db_session,
            model=Club,
            conditions=conditions,
            size=size,
            page=page,
            order_by=[Club.created_at.desc()],  # Order by newest first
            preload_relationships=[],
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

        # Get total count for pagination
        count: int = await common_cruds.get_count(
            model=Club, session=db_session, conditions=conditions
        )
        num_of_pages: int = response_builder.calculate_pages(count=count, size=size)

        return ListClubSchema(clubs=clubs_responses, num_of_pages=num_of_pages)

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.patch("/clubs", response_model=ClubResponseSchema)
async def update_club(
    request: Request,
    club_id: int,
    new_data: ClubUpdateSchema,
    user: Annotated[dict, Depends(check_token)],
    admin: Annotated[bool, Depends(check_admin)],
    db_session: AsyncSession = Depends(get_db_session),
) -> ClubResponseSchema:
    """
    Updates fields of an existing club. Requires admin privileges.

    **Requirements:**
    - The user must be authenticated (`access_token` cookie required)
    - The user must have admin privileges (checked via dependency)

    **Parameters:**
    - `club_id`: ID of the club to update
    - `new_data`: Updated club data including name, description, type, etc.

    **Returns:**
    - Updated club with all its details and media

    **Errors:**
    - Returns 404 if club is not found
    - Returns 500 on internal error
    """
    try:
        # Get club with admin check
        conditions = []  # No additional conditions since admin check is done via dependency
        club: Club | None = await common_cruds.get_resource_by_id(
            session=db_session,
            model=Club,
            resource_id=club_id,
            conditions=conditions,
            preload_relationships=[],
        )

        if club is None:
            raise HTTPException(status_code=404, detail="Club not found")

        # Update club in database
        updated_club: Club | None = await common_cruds.update_resource(
            session=db_session, resource=club, update_data=new_data
        )

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

        media_objects: List[Media] = await common_cruds.get_resources(
            session=db_session, model=Media, conditions=conditions, preload_relationships=[]
        )

        media_responses: List[MediaResponse] = await response_builder.build_media_responses(
            request=request, media_objects=media_objects
        )

        return await utils.build_club_response(club=updated_club, media_responses=media_responses)

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete("/clubs", status_code=status.HTTP_204_NO_CONTENT)
async def delete_club(
    request: Request,
    club_id: int,
    user: Annotated[dict, Depends(check_token)],
    admin: Annotated[bool, Depends(check_admin)],
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
    try:
        # Get club with admin check
        club_conditions = [Club.id == club_id]  # Admin check is done via dependency

        club: Club | None = await common_cruds.get_resource_by_id(
            session=db_session,
            model=Club,
            resource_id=club_id,
            conditions=club_conditions,
            preload_relationships=[],
        )

        if club is None:
            raise HTTPException(status_code=404, detail="Club not found")

        # Get and delete associated media files
        media_conditions = [Media.entity_id == club.id, Media.entity_type == EntityType.clubs]

        media_objects: List[Media] = await common_cruds.get_resources(
            session=db_session, model=Media, conditions=media_conditions, preload_relationships=[]
        )

        # Delete media files from storage bucket
        if media_objects:
            for media in media_objects:
                await delete_bucket_object(request, media.name)

        # Delete club from database
        club_deleted = await common_cruds.delete_resource(session=db_session, resource=club)

        # Delete associated media records from database
        media_deleted = await common_cruds.delete_resource(
            session=db_session, resource=media_objects
        )

        if not club_deleted or not media_deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

        # Remove from search index
        await meilisearch.delete(
            request=request, storage_name=Club.__tablename__, primary_key=str(club_id)
        )

        return status.HTTP_204_NO_CONTENT

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/events", response_model=ListEventSchema)
async def get_events(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    size: int = 20,
    page: int = 1,
    club_type: Optional[ClubType] = None,
    event_policy: Optional[EventPolicy] = None,
    club_id: Optional[int] = None,
    order: Optional[OrderEvents] = OrderEvents.event_datetime,
    db_session: AsyncSession = Depends(get_db_session),
) -> ListEventSchema:
    """
    Retrieves a paginated list of events with flexible filtering.

    **Parameters:**
    - `size`: Number of events per page (default: 20)
    - `page`: Page number (default: 1)
    - `club_type`: Filter by club type (optional)
    - `event_policy`: Filter by event policy (optional)
    - `club_id`: Filter by specific club (optional)
    - `order`: Sort order for events (default: by event_datetime)

    **Returns:**
    - List of events matching the criteria with pagination info

    **Notes:**
    - Results are ordered by event datetime by default
    - Each event includes its associated media in carousel format
    - When club_id is provided, returns only events for that specific club
    - Returns 404 if specified club_id doesn't exist
    """
    try:
        # Verify club exists if club_id is provided
        if club_id:
            club: Club | None = await common_cruds.get_resource_by_id(
                session=db_session,
                model=Club,
                resource_id=club_id,
                conditions=[],
                preload_relationships=[],
            )
            if club is None:
                raise HTTPException(status_code=404, detail="Club not found")

        # Build conditions list
        conditions = []
        if club_type:
            conditions.append(Club.type == club_type)
        if event_policy:
            conditions.append(ClubEvent.policy == event_policy)
        if club_id:
            conditions.append(ClubEvent.club_id == club_id)

        # Set up ordering
        order_by = [ClubEvent.event_datetime.desc()]
        if order == OrderEvents.event_datetime:
            order_by = [ClubEvent.event_datetime.desc()]
        # Add other order cases if needed

        # Get events with conditions
        events: List[ClubEvent] = await common_cruds.get_resources(
            session=db_session,
            model=ClubEvent,
            conditions=conditions,
            size=size,
            page=page,
            order_by=order_by,
            preload_relationships=[ClubEvent.club],
        )

        # Build responses with media
        event_responses: List[ClubEventResponseSchema] = await response_builder.build_responses(
            request=request,
            items=events,
            session=db_session,
            media_format=MediaFormat.carousel,
            entity_type=EntityType.club_events,
            response_builder=utils.build_event_response,
        )

        # Get total count for pagination
        count: int = await common_cruds.get_count(
            model=ClubEvent, session=db_session, conditions=conditions
        )
        num_of_pages: int = response_builder.calculate_pages(count=count, size=size)

        return ListEventSchema(events=event_responses, num_of_pages=num_of_pages)

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/events", response_model=ClubEventResponseSchema)
async def add_event(
    request: Request,
    event_data: ClubEventRequestSchema,
    user: Annotated[dict, Depends(check_token)],
    admin: Annotated[bool, Depends(check_admin)],
    db_session: AsyncSession = Depends(get_db_session),
) -> ClubEventResponseSchema:
    """
    Creates a new event. Requires admin privileges.

    **Requirements:**
    - The user must be authenticated (`access_token` cookie required)
    - The user must have admin privileges (checked via dependency)

    **Parameters:**
    - `event_data`: Event data including name, description, club_id, etc.

    **Returns:**
    - Created event with all its details and media

    **Notes:**
    - The event is indexed in Meilisearch after creation
    - Associated club must exist, otherwise returns 400
    """
    try:
        # Create event using common CRUD
        event: ClubEvent = await common_cruds.add_resource(
            session=db_session,
            model=ClubEvent,
            data=event_data,
            preload_relationships=[ClubEvent.club],
        )

    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Database integrity error: probably non-existent club_id. "
                f"Details: {str(e.orig)}"
            ),
        )

    # Index in Meilisearch
    await meilisearch.upsert(
        request=request,
        storage_name=ClubEvent.__tablename__,
        json_values={
            "id": event.id,
            "name": event.name,
            "description": event.description,
            "club_id": event.club_id,
            "policy": event.policy.value if event.policy else None,
        },
    )

    # Get associated media
    conditions = [
        Media.entity_id == event.id,
        Media.entity_type == EntityType.club_events,
        Media.media_format == MediaFormat.carousel,
    ]

    media_objects: List[Media] = await common_cruds.get_resources(
        session=db_session, model=Media, conditions=conditions, preload_relationships=[]
    )

    media_responses: List[MediaResponse] = await response_builder.build_media_responses(
        request=request, media_objects=media_objects
    )

    return await utils.build_event_response(event=event, media_responses=media_responses)


@router.patch("/events", response_model=ClubEventResponseSchema)
async def update_event(
    request: Request,
    event_id: int,
    new_data: ClubEventUpdateSchema,
    user: Annotated[dict, Depends(check_token)],
    admin: Annotated[bool, Depends(check_admin)],
    db_session: AsyncSession = Depends(get_db_session),
) -> ClubEventResponseSchema:
    """
    Updates fields of an existing event. Requires admin privileges.

    **Requirements:**
    - The user must be authenticated (`access_token` cookie required)
    - The user must have admin privileges (checked via dependency)

    **Parameters:**
    - `event_id`: ID of the event to update
    - `new_data`: Updated event data including name, description, policy, etc.

    **Returns:**
    - Updated event with all its details and media

    **Errors:**
    - Returns 404 if event is not found
    - Returns 500 on internal error
    """
    try:
        # Get event with admin check
        conditions = []  # No additional conditions since admin check is done via dependency
        event: ClubEvent | None = await common_cruds.get_resource_by_id(
            session=db_session,
            model=ClubEvent,
            resource_id=event_id,
            conditions=conditions,
            preload_relationships=[ClubEvent.club],
        )

        if event is None:
            raise HTTPException(status_code=404, detail="Event not found")

        # Update event in database
        updated_event: ClubEvent | None = await common_cruds.update_resource(
            session=db_session, resource=event, update_data=new_data
        )

        # Update Meilisearch index
        await meilisearch.upsert(
            request=request,
            storage_name=ClubEvent.__tablename__,
            json_values={
                "id": updated_event.id,
                "name": updated_event.name,
                "description": updated_event.description,
                "club_id": updated_event.club_id,
                "policy": updated_event.policy.value if updated_event.policy else None,
            },
        )

        # Get associated media
        conditions = [
            Media.entity_id == updated_event.id,
            Media.entity_type == EntityType.club_events,
            Media.media_format == MediaFormat.carousel,
        ]

        media_objects: List[Media] = await common_cruds.get_resources(
            session=db_session, model=Media, conditions=conditions, preload_relationships=[]
        )

        media_responses: List[MediaResponse] = await response_builder.build_media_responses(
            request=request, media_objects=media_objects
        )

        return await utils.build_event_response(
            event=updated_event, media_responses=media_responses
        )

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete("/events", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    request: Request,
    event_id: int,
    user: Annotated[dict, Depends(check_token)],
    admin: Annotated[bool, Depends(check_admin)],
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Deletes a specific event. Requires admin privileges.

    **Requirements:**
    - The user must be authenticated (`access_token` cookie required)
    - The user must have admin privileges (checked via dependency)

    **Parameters:**
    - `event_id`: The ID of the event to delete

    **Process:**
    - Deletes the event entry from the database
    - Deletes all related media files from the storage bucket and their DB records
    - Removes the event from the Meilisearch index

    **Returns:**
    - HTTP 204 No Content on successful deletion

    **Errors:**
    - Returns 404 if the event is not found
    - Returns 500 on internal error
    """
    try:
        # Get event with admin check

        event: ClubEvent | None = await common_cruds.get_resource_by_id(
            session=db_session,
            model=ClubEvent,
            resource_id=event_id,
            preload_relationships=[ClubEvent.club],
        )

        if event is None:
            raise HTTPException(status_code=404, detail="Event not found")

        # Get and delete associated media files
        media_conditions = [
            Media.entity_id == event.id,
            Media.entity_type == EntityType.club_events,
        ]

        media_objects: List[Media] = await common_cruds.get_resources(
            session=db_session, model=Media, conditions=media_conditions, preload_relationships=[]
        )

        # Delete media files from storage bucket
        if media_objects:
            for media in media_objects:
                await delete_bucket_object(request, media.name)

        # Delete event from database
        event_deleted = await common_cruds.delete_resource(session=db_session, resource=event)

        # Delete associated media records from database
        media_deleted = await common_cruds.delete_resource(
            session=db_session, resource=media_objects
        )

        if not event_deleted or not media_deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

        # Remove from search index
        await meilisearch.delete(
            request=request, storage_name=ClubEvent.__tablename__, primary_key=str(event_id)
        )

        return status.HTTP_204_NO_CONTENT

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/events/{event_id}", response_model=ClubEventResponseSchema)
async def get_event(
    event_id: int,
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
) -> ClubEventResponseSchema:
    """
    Retrieves a single event by its unique ID, including
    its associated media files.

    **Parameters:**
    - `event_id`: The unique identifier of the event to retrieve
    - `access_token`: Required authentication token from cookies (via dependency)

    **Returns:**
    - A detailed event object if found, including its name, description,
    club details, policy, and media URLs

    **Errors:**
    - Returns `404 Not Found` if the event with the specified ID does not exist
    - Returns `401 Unauthorized` if no valid access token is provided
    """
    try:
        # Get event with its club relationship
        event = await common_cruds.get_resource_by_id(
            session=db_session,
            model=ClubEvent,
            resource_id=event_id,
            conditions=[],
            preload_relationships=[ClubEvent.club],
        )

        if event is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

        # Get associated media
        conditions = [
            Media.entity_id == event.id,
            Media.entity_type == EntityType.club_events,
            Media.media_format == MediaFormat.carousel,
        ]

        media_objects: List[Media] = await common_cruds.get_resources(
            session=db_session, model=Media, conditions=conditions, preload_relationships=[]
        )

        media_responses: List[MediaResponse] = await response_builder.build_media_responses(
            request=request, media_objects=media_objects
        )

        return await utils.build_event_response(event=event, media_responses=media_responses)

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
