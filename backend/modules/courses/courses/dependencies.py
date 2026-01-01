
from fastapi import Depends, HTTPException, Path, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_db_session, get_infra
from backend.common.schemas import Infra
from backend.core.database.models.grade_report import CourseItem, StudentCourse
from backend.modules.auth.keycloak_manager import KeyCloakManager
from backend.modules.calendar.google_calendar_service import GoogleCalendarService
from backend.modules.courses.registrar.service import RegistrarService
from backend.modules.courses.courses.repository import CourseRepository
from backend.modules.courses.courses.service import StudentCourseService


async def get_student_course_service(
    request: Request,
    db_session: AsyncSession = Depends(get_db_session),
    infra: Infra = Depends(get_infra),
) -> StudentCourseService:
    repository = CourseRepository(db_session=db_session)
    kc_manager: KeyCloakManager = request.app.state.kc_manager if request else None
    calendar_service = GoogleCalendarService(kc_manager=kc_manager) if kc_manager else None
    return StudentCourseService(
        repository=repository,
        registrar_service=RegistrarService(meilisearch_client=infra.meilisearch_client),
        infra=infra,
        kc_manager=kc_manager,
        calendar_service=calendar_service,
    )

async def course_item_exists_or_404(
    item_id: int = Path(..., description="The ID of the course item"),
    db_session: AsyncSession = Depends(get_db_session),
) -> CourseItem:
    """
    Dependency to check if a course item exists.
    """
    item = await db_session.get(CourseItem, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course item not found.")
    return item


async def student_course_exists_or_404(
    student_course_id: int = Path(..., description="The ID of the student course registration"),
    db_session: AsyncSession = Depends(get_db_session),
) -> StudentCourse:
    """
    Dependency to check if a student_course exists.
    """
    student_course = await db_session.get(StudentCourse, student_course_id)
    if not student_course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Student course registration not found"
        )
    return student_course