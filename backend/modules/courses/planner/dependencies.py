from fastapi import Depends, Request

from backend.common.dependencies import get_infra, get_uow
from backend.common.schemas import Infra
from backend.core.database.uow import UnitOfWork
from backend.modules.courses.registrar.service import RegistrarService
from backend.modules.courses.planner.service import PlannerService


async def get_planner_service(
    request: Request,
    uow: UnitOfWork = Depends(get_uow),
    infra: Infra = Depends(get_infra),
) -> PlannerService:
    registrar_service = RegistrarService(
        meilisearch_client=infra.meilisearch_client,
        active_semester=request.app.state.active_registrar_semester,
    )
    return PlannerService(
        uow=uow,
        course_catalog=registrar_service,
        active_semester=request.app.state.active_registrar_semester,
    )
