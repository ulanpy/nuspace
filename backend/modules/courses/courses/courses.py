"""
This module is as a tribute to the creator 
of crashed.nu — @superhooman.
GitHub: https://github.com/superhooman/crashed.nu
"""



from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_creds_or_401, get_db_session, get_infra
from backend.common.schemas import Infra
from backend.core.database.models.grade_report import CourseItem
from backend.modules.courses.courses import dependencies as deps
from backend.modules.courses.courses import schemas
from backend.modules.courses.courses.policy import CourseItemPolicy, StudentCoursePolicy
from backend.modules.courses.courses.service import StudentCourseService
from backend.modules.courses.registrar.service import RegistrarService
from backend.modules.courses.registrar.dependencies import get_registrar_service

router = APIRouter(tags=["Courses"])

@router.post("/registered_courses/sync", response_model=schemas.RegistrarSyncResponse)
async def sync_courses_from_registrar(
    data: schemas.RegistrarSyncRequest,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
    registrar_service: RegistrarService = Depends(get_registrar_service),
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
    student_sub = user[0].get("sub")
    student_username = user[0].get("email").split("@")[0] #e.g. ulan.sharipov
    service = StudentCourseService(db_session=db_session)
    sync_result = await service.sync_courses_from_registrar(
        student_sub=student_sub,
        password=data.password,
        username=student_username,
        registrar_service=registrar_service
    )

    return sync_result


@router.get("/registered_courses", response_model=List[schemas.RegisteredCourseResponse])
async def get_registered_courses(
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
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

    service = StudentCourseService(db_session=db_session)
    return await service.get_registered_courses(student_sub=student_sub)


@router.get("/registered_courses/schedule", response_model=schemas.StudentScheduleResponse | None)
async def get_registered_courses_schedule(
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Return the most recently synced registrar schedule for the authenticated user.
    """
    student_sub = user[0].get("sub")
    StudentCoursePolicy(user=user).check_read_list(student_sub=student_sub)

    service = StudentCourseService(db_session=db_session)
    return await service.get_latest_schedule(student_sub=student_sub)


@router.post("/course_items", response_model=schemas.BaseCourseItem)
async def add_course_item(
    course_item_data: schemas.CourseItemCreate,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
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
    student_course = await deps.student_course_exists_or_404(
        student_course_id=course_item_data.student_course_id, db_session=db_session
    )
    CourseItemPolicy(user=user).check_create(student_course=student_course)

    student_sub = user[0].get("sub")
    service = StudentCourseService(db_session=db_session)
    item = await service.add_course_item(
        course_item_data=course_item_data, student_sub=student_sub
    )

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registered course not found for this user.",
        )

    return item


@router.patch("/course_items/{item_id}", response_model=schemas.BaseCourseItem)
async def update_course_item(
    item_update: schemas.CourseItemUpdate,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
    item: CourseItem = Depends(deps.course_item_exists_or_404),
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
    student_course = await deps.student_course_exists_or_404(
        student_course_id=item.student_course_id, db_session=db_session
    )
    CourseItemPolicy(user=user).check_update(
        student_course=student_course, item_data=item_update
    )

    service = StudentCourseService(db_session=db_session)
    return await service.update_course_item(item=item, item_update=item_update)


@router.delete("/course_items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course_item(
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
    item: CourseItem = Depends(deps.course_item_exists_or_404),
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
    student_course = await deps.student_course_exists_or_404(
        student_course_id=item.student_course_id, db_session=db_session
    )
    CourseItemPolicy(user=user).check_delete(student_course=student_course)
    service = StudentCourseService(db_session=db_session)
    await service.delete_course_item(item=item)
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
    db_session: AsyncSession = Depends(get_db_session),
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
    service = StudentCourseService(db_session=db_session)
    return await service.get_courses(
        infra=infra, page=page, size=size, term=term, keyword=keyword
    )
