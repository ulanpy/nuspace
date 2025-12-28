
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database.models import Opportunity, OpportunityEligibility, OpportunityMajorMap
from backend.common.utils import response_builder
from backend.modules.opportunities import schemas
from backend.modules.opportunities.repository import OpportunitiesRepository


class OpportunitiesDigestService:
    """
    Service layer delegates data access to OpportunitiesRepository.
    Keeps business rules separate from persistence details.
    """

    def __init__(self, db_session: AsyncSession, meilisearch_client=None, repo: OpportunitiesRepository | None = None):
        self.repo = repo or OpportunitiesRepository(db_session, meilisearch_client=meilisearch_client)

    async def _build_opportunity_responses(
        self,
        opportunities: list[Opportunity],
    ) -> list[schemas.OpportunityResponseDto]:
        if not opportunities:
            return []

        responses: list[schemas.OpportunityResponseDto] = []
        for opp in opportunities:
            eligibilities = [
                schemas.OpportunityEligibilityBase.model_validate(el)
                for el in opp.eligibilities
            ]
            majors = [
                schemas.OpportunityMajorMapBase.model_validate(m)
                for m in opp.majors
            ]
            responses.append(
                response_builder.build_schema(
                    schemas.OpportunityResponseDto,
                    schemas.OpportunityResponseDto.model_validate(opp),
                    eligibilities=eligibilities,
                    majors=majors,
                )
            )
        return responses

    async def list(self, flt: schemas.OpportunityFilter) -> schemas.OpportunityListResponse:
        items, total = await self.repo.list(flt)
        total_pages = (total + flt.size - 1) // flt.size if flt.size else 0
        return schemas.OpportunityListResponse(
            items=await self._build_opportunity_responses(items),
            total=total,
            page=flt.page,
            size=flt.size,
            total_pages=total_pages,
            has_next=flt.page < total_pages,
        )

    async def get(self, id: int) -> schemas.OpportunityResponseDto | None:
        record = await self.repo.get(id)
        if not record:
            return None
        built = await self._build_opportunity_responses([record])
        return built[0] if built else None

    async def create(self, payload: schemas.OpportunityCreateDto) -> schemas.OpportunityResponseDto:
        record: Opportunity = await self.repo.create(payload)
        built = await self._build_opportunity_responses([record])
        return built[0]

    async def update(self, id: int, payload: schemas.OpportunityUpdateDto) -> schemas.OpportunityResponseDto | None:
        record: Opportunity | None = await self.repo.update(id, payload)
        if not record:
            return None
        built = await self._build_opportunity_responses([record])
        return built[0] if built else None

    async def delete(self, id: int) -> bool:
        return await self.repo.delete(id)
