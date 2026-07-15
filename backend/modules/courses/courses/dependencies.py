from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_db_session, get_infra
from backend.common.schemas import Infra
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
        registrar=RegistrarService(meilisearch_client=infra.meilisearch_client),
        infra=infra,
        kc_manager=kc_manager,
        calendar_sync=calendar_service,
    )
