"""
This module is as a tribute to the creator 
of crashed.nu — @superhooman.
GitHub: https://github.com/superhooman/crashed.nu
"""



from typing import Annotated, List

import httpx
from backend.common.dependencies import get_infra
from backend.modules.auth.dependencies import get_creds_or_401
from backend.common.schemas import Infra
from backend.core.configs.config import config
from backend.modules.courses.courses import schemas
from backend.modules.courses.courses.dependencies import get_student_course_service
from backend.modules.courses.courses.errors import CourseLookupError, SemesterResolutionError
from backend.modules.courses.courses.policy import StudentCoursePolicy
from backend.modules.courses.registrar.clients.registrar_client import (
    RegistrarLoginUnconfirmed,
)
from backend.modules.courses.courses.service import StudentCourseService
from fastapi import APIRouter, Cookie, Depends, HTTPException, Query, status
from fastapi.responses import Response

router = APIRouter(tags=["Student Courses"])


@router.post("/registered_courses/sync", response_model=schemas.RegistrarSyncResponse)
async def sync_courses_from_registrar(
    data: schemas.RegistrarSyncRequest,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    service: StudentCourseService = Depends(get_student_course_service),
):
    """
    Syncs courses from the university registrar for the authenticated student.

    **Access Policy:**
    - Students can only sync their own courses

    **Parameters:**
    - `data`: Registrar credentials (password)

    **Returns:**
    - List of synced courses with total count

    **Process:**
    1. Fetches student's schedule from registrar
    2. Determines current semester based on current date
    3. For each course in the schedule:
       - Checks if course exists in local database
       - If not, fetches course details from registrar and creates it
       - Creates StudentCourse registration if not already registered
    """
    try:
        student_sub = user[0].get("sub")
        # In production the registrar username is the local part of the NU
        # email. Locally the session is a mock user with no such email, so it
        # comes from REGISTRAR_DEBUG_USERNAME -- set it to your own username.
        student_username = user[0].get("email").split("@")[0]
        if config.IS_DEBUG and config.REGISTRAR_DEBUG_USERNAME:
            student_username = config.REGISTRAR_DEBUG_USERNAME
        sync_result = await service.sync_courses_from_registrar(
            student_sub=student_sub,
            password=data.password,
            username=student_username,
        )
        return sync_result

    except CourseLookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    except SemesterResolutionError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    except RegistrarLoginUnconfirmed as e:
        # Not a credentials problem, so not a 401 -- telling the student to
        # check a password that works wastes their time and hides a real fault.
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

    except ValueError as e:
        # Registrar login failures bubble up as ValueError
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

    except httpx.RequestError as e:
        # DNS, TLS or connectivity failure reaching the registrar.
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not reach the registrar: {e.__class__.__name__}",
        )

    


@router.post("/registered_courses/sync/pdf", response_model=schemas.RegistrarSyncResponse)
async def sync_courses_from_schedule_pdf(
    data: schemas.RegistrarSyncPdfRequest,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    service: StudentCourseService = Depends(get_student_course_service),
):
    """
    Sync registered courses from an uploaded registrar personal schedule PDF.
    """
    try:
        student_sub = user[0].get("sub")
        return await service.sync_courses_from_schedule_pdf(
            student_sub=student_sub,
            pdf_file=data.pdf_file,
        )

    except CourseLookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    except SemesterResolutionError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/registered_courses", response_model=List[schemas.RegisteredCourseResponse])
async def get_registered_courses(
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    service: StudentCourseService = Depends(get_student_course_service),
):
    """
    Retrieves all courses registered by the authenticated student.

    **Access Policy:**
    - Students can only view their own registered courses
    - Admin can view any student's registered courses

    **Returns:**
    - List of registered courses with course details, items, and class averages
    """
    student_sub = user[0].get("sub")
    StudentCoursePolicy(user=user).check_read_list(student_sub=student_sub)

    return await service.get_registered_courses(student_sub=student_sub)


@router.get("/registered_courses/schedule", response_model=schemas.StudentScheduleResponse | None)
async def get_registered_courses_schedule(
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    service: StudentCourseService = Depends(get_student_course_service),
):
    """
    Return the most recently synced registrar schedule for the authenticated user.
    """
    student_sub = user[0].get("sub")
    StudentCoursePolicy(user=user).check_read_list(student_sub=student_sub)

    return await service.get_latest_schedule(student_sub=student_sub)


@router.post(
    "/registered_courses/schedule/google",
    response_model=schemas.GoogleCalendarExportResponse,
)
async def export_registered_schedule_to_google_calendar(
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    infra: Infra = Depends(get_infra),
    kc_access_token: Annotated[str | None, Cookie(alias=config.COOKIE_ACCESS_NAME)] = None,
    kc_refresh_token: Annotated[str | None, Cookie(alias=config.COOKIE_REFRESH_NAME)] = None,
    service: StudentCourseService = Depends(get_student_course_service),
):
    """
    Export the student's latest registrar schedule to Google Calendar.
    """
    student_sub = user[0].get("sub")
    StudentCoursePolicy(user=user).check_read_list(student_sub=student_sub)

    try:
        return await service.export_schedule_to_google_calendar(
            student_sub=student_sub,
            kc_access_token=kc_access_token,
            kc_refresh_token=kc_refresh_token,
            infra=infra,
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/registered_courses/schedule/ics")
async def export_registered_schedule_to_ics(
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    infra: Infra = Depends(get_infra),
    service: StudentCourseService = Depends(get_student_course_service),
):
    """
    Download the student's latest registrar schedule as an iCalendar (.ics) file.
    Works with Apple Calendar, Outlook, and other apps that import .ics.
    """
    student_sub = user[0].get("sub")
    StudentCoursePolicy(user=user).check_read_list(student_sub=student_sub)

    try:
        ics_body = await service.export_schedule_to_ics(
            student_sub=student_sub,
            infra=infra,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    return Response(
        content=ics_body,
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="schedule.ics"',
        },
    )


@router.post("/course_items", response_model=schemas.BaseCourseItem)
async def add_course_item(
    course_item_data: schemas.CourseItemCreate,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    service: StudentCourseService = Depends(get_student_course_service),
) -> schemas.BaseCourseItem:
    """
    Adds a new course item (assignment, exam, etc.) to a registered course.

    **Access Policy:**
    - Students can only add items to their own registered courses
    - Admin can add items to any course

    **Parameters:**
    - `course_item_data`: Course item data including student_course_id, name, scores, etc.

    **Returns:**
    - Created course item with all details
    """
    return await service.add_course_item(course_item_data=course_item_data, user=user)


@router.patch("/course_items/{item_id}", response_model=schemas.BaseCourseItem)
async def update_course_item(
    item_id: int,
    item_update: schemas.CourseItemUpdate,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    service: StudentCourseService = Depends(get_student_course_service),
) -> schemas.BaseCourseItem:
    """
    Updates an existing course item.

    **Access Policy:**
    - Students can only update items in their own registered courses
    - Admin can update any course item

    **Parameters:**
    - `item_id`: ID of the course item to update
    - `item_update`: Updated course item data (partial update)

    **Returns:**
    - Updated course item with all details

    """
    return await service.update_course_item(
        item_id=item_id, item_update=item_update, user=user
    )


@router.delete("/course_items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course_item(
    item_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    service: StudentCourseService = Depends(get_student_course_service),
) -> None:
    """
    Deletes a specific course item.

    **Access Policy:**
    - Students can only delete items from their own registered courses
    - Admin can delete any course item

    **Parameters:**
    - `item_id`: ID of the course item to delete

    **Returns:**
    - HTTP 204 No Content on successful deletion

    """
    await service.delete_course_item(item_id=item_id, user=user)
    return


@router.get("/courses", response_model=schemas.ListBaseCourseResponse)
async def get_courses(
    infra: Infra = Depends(get_infra),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    term: str | None = Query(default=None, description="Filter courses by term"),
    keyword: str | None = Query(
        default=None, description="Search keyword for course code or course title"
    ),
    service: StudentCourseService = Depends(get_student_course_service),
) -> schemas.ListBaseCourseResponse:
    """
    Retrieves a paginated list of all courses with optional filtering and search.

    **Access Policy:**
    - Anyone can view courses (no authentication required)

    **Parameters:**
    - `page`: Page number to retrieve (default: 1, minimum: 1)
    - `size`: Number of courses per page (default: 20, max: 100, minimum: 1)
    - `term`: Filter courses by specific academic term (optional)
    - `keyword`: Search keyword for course code or course title (optional)

    **Returns:**
    - Paginated list of courses with total pages information
    """
    return await service.get_courses(
        infra=infra, page=page, size=size, term=term, keyword=keyword
    )
