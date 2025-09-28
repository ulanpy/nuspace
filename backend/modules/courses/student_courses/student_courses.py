from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_creds_or_401, get_db_session, get_infra
from backend.common.schemas import Infra
from backend.core.database.models.grade_report import CourseItem, StudentCourse
from backend.modules.courses.student_courses import dependencies as deps
from backend.modules.courses.student_courses import schemas
from backend.modules.courses.student_courses.policy import CourseItemPolicy, StudentCoursePolicy
from backend.modules.courses.student_courses.service import StudentCourseService

router = APIRouter(tags=["Grades"])


@router.post("/registered_courses", response_model=schemas.RegisteredCourseResponse)
async def register_course(
    data: schemas.RegisteredCourseCreate,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Registers a student for a specific course.

    **Access Policy:**
    - Students can only register courses for themselves
    - Admin can register courses for any student

    **Parameters:**
    - `data`: Course registration data including course_id

    **Returns:**
    - Created course registration with course details
    """
    student_sub = user[0].get("sub")
    StudentCoursePolicy(user=user).check_create(student_sub=student_sub)

    service = StudentCourseService(db_session=db_session)
    student_course = await service.register_course(data=data, student_sub=student_sub)

    if not student_course:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Course already registered for this student.",
        )

    return schemas.RegisteredCourseResponse(
        id=student_course.id, course=student_course.course, items=[]
    )


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


@router.delete("/registered_courses/{student_course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unregister_course(
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
    student_course: StudentCourse = Depends(deps.student_course_exists_or_404),
):
    """
    Unregisters a student from a specific course.

    **Access Policy:**
    - Students can only unregister from their own courses
    - Admin can unregister any student from any course

    **Parameters:**
    - `student_course_id`: ID of the course registration to remove

    **Returns:**
    - HTTP 204 No Content on successful unregistration
    """
    student_sub = user[0].get("sub")
    service = StudentCourseService(db_session=db_session)

    StudentCoursePolicy(user=user).check_delete(student_course=student_course)

    success = await service.unregister_course(
        student_course_id=student_course.id, student_sub=student_sub
    )

    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registration not found.")


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


@router.get("/terms", response_model=List[str])
async def get_terms(
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Retrieves a list of all unique terms from the courses table.

    **Access Policy:**
    - Anyone can view terms (no authentication required)

    **Returns:**
    - List of unique terms available in the system
    """
    service = StudentCourseService(db_session=db_session)
    return await service.get_terms()


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
