from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_creds_or_401, get_db_session
from backend.modules.opportunities import schemas
from backend.modules.opportunities.policy import OpportunityPolicy
from backend.modules.opportunities.service import OpportunitiesDigestService

router = APIRouter(prefix="/opportunities", tags=["Opportunities Digest"])


@router.get("", response_model=schemas.OpportunityListResponse)
async def list_opportunities(
    filters: schemas.OpportunityFilter = Depends(), db: AsyncSession = Depends(get_db_session)
):
    service = OpportunitiesDigestService(db_session=db)
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


@router.get("/{id}", response_model=schemas.OpportunityResponse)
async def get_opportunity(id: int, db: AsyncSession = Depends(get_db_session)):
    service = OpportunitiesDigestService(db_session=db)
    record = await service.get(id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
    return record


@router.post("", response_model=schemas.OpportunityResponse, status_code=status.HTTP_201_CREATED)
async def create_opportunity(
    payload: schemas.OpportunityCreate,
    user=Depends(get_creds_or_401),
    db: AsyncSession = Depends(get_db_session),
):
    OpportunityPolicy(user).check_manage()
    service = OpportunitiesDigestService(db_session=db)
    record = await service.create(payload)
    return record


@router.patch("/{id}", response_model=schemas.OpportunityResponse)
async def update_opportunity(
    id: int,
    payload: schemas.OpportunityUpdate,
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
