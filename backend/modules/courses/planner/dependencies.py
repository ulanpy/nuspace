from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_db_session, get_infra
from backend.common.schemas import Infra
from backend.modules.courses.planner.repository import PlannerRepository
from backend.modules.courses.planner.service import PlannerService
from backend.modules.courses.registrar.service import RegistrarService


async def get_planner_service(
    db_session: AsyncSession = Depends(get_db_session),
    infra: Infra = Depends(get_infra),
) -> PlannerService:
    repository = PlannerRepository(db_session)
    registrar_service = RegistrarService(meilisearch_client=infra.meilisearch_client)
    return PlannerService(repository=repository, registrar_service=registrar_service)

