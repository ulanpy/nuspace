from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_creds_or_401, get_db_session, get_infra
from backend.common.schemas import Infra
from backend.modules.opportunities import schemas
from backend.modules.opportunities.policy import OpportunityPolicy
from backend.modules.opportunities.service import OpportunitiesDigestService

router = APIRouter(prefix="/opportunities", tags=["Opportunities Digest"])


def get_opportunity_filters(
    type: list[schemas.OpportunityType] | None = Query(default=None, description="Filter by opportunity types"),
    majors: list[schemas.OpportunityMajor] | None = Query(default=None, description="Filter by majors"),
    education_level: list[schemas.EducationLevel] | None = Query(
        default=None, description="Filter by education levels"
    ),
    years: list[int] | None = Query(default=None, description="Study years to match (for UG/GrM)"),
    q: str | None = Query(default=None, description="Search in name/description"),
    hide_expired: bool = Query(default=False, description="Hide expired opportunities"),
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    size: int = Query(default=15, ge=1, le=1000, description="Page size"),
) -> schemas.OpportunityFilter:
    return schemas.OpportunityFilter(
        type=type,
        majors=majors,
        education_level=education_level,
        years=years,
        q=q,
        hide_expired=hide_expired,
        page=page,
        size=size,
    )


@router.get("", response_model=schemas.OpportunityListResponse)
async def list_opportunities(
    filters: schemas.OpportunityFilter = Depends(get_opportunity_filters),
    db: AsyncSession = Depends(get_db_session),
    infra: Infra = Depends(get_infra),
):
    service = OpportunitiesDigestService(db_session=db, meilisearch_client=infra.meilisearch_client)
    items, total = await service.list(filters)
    total_pages = (total + filters.size - 1) // filters.size if filters.size else 0
    return schemas.OpportunityListResponse(
        items=items,
        total=total,
        page=filters.page,
        size=filters.size,
        total_pages=total_pages,
        has_next=filters.page < total_pages,
    )


@router.get("/{id}", response_model=schemas.OpportunityResponseDto)
async def get_opportunity(id: int, db: AsyncSession = Depends(get_db_session)):
    service = OpportunitiesDigestService(db_session=db)
    record = await service.get(id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
    return record


@router.post("", response_model=schemas.OpportunityResponseDto, status_code=status.HTTP_201_CREATED)
async def create_opportunity(
    payload: schemas.OpportunityCreateDto,
    user=Depends(get_creds_or_401),
    db: AsyncSession = Depends(get_db_session),
):
    OpportunityPolicy(user).check_manage()
    service = OpportunitiesDigestService(db_session=db)
    record = await service.create(payload)
    return record


@router.patch("/{id}", response_model=schemas.OpportunityResponseDto)
async def update_opportunity(
    id: int,
    payload: schemas.OpportunityUpdateDto,
    user=Depends(get_creds_or_401),
    db: AsyncSession = Depends(get_db_session),
):
    OpportunityPolicy(user).check_manage()
    service = OpportunitiesDigestService(db_session=db)
    record = await service.update(id, payload)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
    return record


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_opportunity(
    id: int,
    user=Depends(get_creds_or_401),
    db: AsyncSession = Depends(get_db_session),
):
    OpportunityPolicy(user).check_manage()
    service = OpportunitiesDigestService(db_session=db)
    ok = await service.delete(id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
    return None
