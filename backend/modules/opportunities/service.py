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

    async def list(self, flt: schemas.OpportunityFilter) -> schemas.OpportunityListResponse:
        items, total = await self.repo.list(flt)
        total_pages = (total + flt.size - 1) // flt.size if flt.size else 0
        return schemas.OpportunityListResponse(
            items=items,
            total=total,
            page=flt.page,
            size=flt.size,
            total_pages=total_pages,
            has_next=flt.page < total_pages,
        )

    async def get(self, id: int) -> schemas.OpportunityResponseDto | None:
        return await self.repo.get(id)

    async def create(self, payload: schemas.OpportunityCreateDto) -> schemas.OpportunityResponseDto:
        record: Opportunity = await self.repo.create(payload)
        return schemas.OpportunityResponseDto.model_validate(record)

    async def update(self, id: int, payload: schemas.OpportunityUpdateDto) -> schemas.OpportunityResponseDto | None:
        record: Opportunity | None = await self.repo.update(id, payload)
        return schemas.OpportunityResponseDto.model_validate(record) if record else None

    async def delete(self, id: int) -> bool:
        return await self.repo.delete(id)
