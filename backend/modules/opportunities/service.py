from typing import List, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database.models import Opportunity
from backend.modules.opportunities import schemas
from backend.modules.opportunities.repository import OpportunitiesRepository


class OpportunitiesDigestService:
    """
    Service layer delegates data access to OpportunitiesRepository.
    Keeps business rules separate from persistence details.
    """

    def __init__(self, db_session: AsyncSession, meilisearch_client=None, repo: OpportunitiesRepository | None = None):
        self.repo = repo or OpportunitiesRepository(db_session, meilisearch_client=meilisearch_client)

    async def list(self, flt: schemas.OpportunityFilter) -> Tuple[List[Opportunity], int]:
        return await self.repo.list(flt)

    async def get(self, id: int) -> Opportunity | None:
        return await self.repo.get(id)

    async def create(self, payload: schemas.OpportunityCreate) -> Opportunity:
        return await self.repo.create(payload)

    async def update(self, id: int, payload: schemas.OpportunityUpdate) -> Opportunity | None:
        return await self.repo.update(id, payload)

    async def delete(self, id: int) -> bool:
        return await self.repo.delete(id)
