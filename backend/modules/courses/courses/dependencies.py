from fastapi import Depends, Request

from backend.common.dependencies import get_infra, get_uow
from backend.common.schemas import Infra
from backend.modules.auth.keycloak_manager import KeyCloakManager
from backend.modules.calendar.google_calendar_service import GoogleCalendarService
from backend.modules.courses.courses.service import StudentCourseService
from backend.modules.courses.registrar.service import RegistrarService
from backend.core.database.uow import UnitOfWork


async def get_student_course_service(
    request: Request,
    uow: UnitOfWork = Depends(get_uow),
    infra: Infra = Depends(get_infra),
) -> StudentCourseService:
    kc_manager: KeyCloakManager = request.app.state.kc_manager if request else None
    calendar_service = GoogleCalendarService(kc_manager=kc_manager) if kc_manager else None
    return StudentCourseService(
        uow=uow,
        registrar=RegistrarService(
            meilisearch_client=infra.meilisearch_client,
            active_semester=request.app.state.active_registrar_semester,
        ),
        infra=infra,
        kc_manager=kc_manager,
        calendar_sync=calendar_service,
    )
