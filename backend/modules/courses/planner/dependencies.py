from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_db_session, get_infra
from backend.common.schemas import Infra
from backend.modules.courses.registrar.service import RegistrarService
from backend.modules.courses.planner.repository import PlannerRepository
from backend.modules.courses.planner.service import PlannerService


async def get_planner_service(
    request: Request,
    db_session: AsyncSession = Depends(get_db_session),
    infra: Infra = Depends(get_infra),
) -> PlannerService:
    repository = PlannerRepository(db_session)
    registrar_service = RegistrarService(
        meilisearch_client=infra.meilisearch_client,
        active_semester=request.app.state.active_registrar_semester,
    )
    return PlannerService(
        repository=repository,
        course_catalog=registrar_service,
        active_semester=request.app.state.active_registrar_semester,
    )
