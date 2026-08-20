from backend.common.dependencies import get_uow
from backend.core.database.uow import UnitOfWork
from backend.modules.courses.planner.service import PlannerCatalogSearchService, PlannerService
from backend.modules.courses.registrar.service import RegistrarService
from fastapi import Depends, Request


def _registrar_service(request: Request) -> RegistrarService:
    return RegistrarService(
        meilisearch_client=request.app.state.meilisearch_client,
        active_semester=request.app.state.active_registrar_semester,
    )


async def get_planner_service(
    request: Request,
    uow: UnitOfWork = Depends(get_uow),
) -> PlannerService:
    # Planner reads only the shared course catalog index. Building the broad
    # Infra Pydantic model (Redis, broker, GCS, Config, …) per request created
    # needless allocations on this hot path.
    registrar_service = _registrar_service(request)
    return PlannerService(
        uow=uow,
        course_catalog=registrar_service,
        active_semester=request.app.state.active_registrar_semester,
    )


async def get_planner_catalog_search_service(
    request: Request,
) -> PlannerCatalogSearchService:
    return PlannerCatalogSearchService(
        course_catalog=_registrar_service(request),
        active_semester=request.app.state.active_registrar_semester,
    )
