from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Cookie

from backend.common.dependencies import get_creds_or_401
from backend.modules.opportunities import schemas
from backend.modules.opportunities.policy import OpportunityPolicy
from backend.modules.opportunities.service import OpportunitiesDigestService
from backend.modules.opportunities.dependencies import get_opportunity_filters, get_opportunities_digest_service
from backend.core.configs.config import config


router = APIRouter(prefix="/opportunities", tags=["Opportunities Digest"])


@router.get("", response_model=schemas.OpportunityListResponse)
async def list_opportunities(
    filters: schemas.OpportunityFilter = Depends(get_opportunity_filters),
    service: OpportunitiesDigestService = Depends(get_opportunities_digest_service),
):
    return await service.list(filters)


@router.get("/{id}", response_model=schemas.OpportunityResponseDto)
async def get_opportunity(
    id: int,
    service: OpportunitiesDigestService = Depends(get_opportunities_digest_service),
):
    record = await service.get(id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
    return record


@router.post("", response_model=schemas.OpportunityResponseDto, status_code=status.HTTP_201_CREATED)
async def create_opportunity(
    payload: schemas.OpportunityCreateDto,
    user=Depends(get_creds_or_401),
    service: OpportunitiesDigestService = Depends(get_opportunities_digest_service),
):
    OpportunityPolicy(user).check_manage()
    record = await service.create(payload)
    return record

@router.patch("/{id}", response_model=schemas.OpportunityResponseDto)
async def update_opportunity(
    id: int,
    payload: schemas.OpportunityUpdateDto,
    user=Depends(get_creds_or_401),
    service: OpportunitiesDigestService = Depends(get_opportunities_digest_service),
):
    OpportunityPolicy(user).check_manage()
    record = await service.update(id, payload)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
    return record


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_opportunity(
    id: int,
    user=Depends(get_creds_or_401),
    service: OpportunitiesDigestService = Depends(get_opportunities_digest_service),
):
    OpportunityPolicy(user).check_manage()
    ok = await service.delete(id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
    return None


@router.post("/{id}/calendar", response_model=schemas.OpportunityCalendarResponse)
async def add_opportunity_to_calendar(
    id: int,
    user=Depends(get_creds_or_401),
    kc_access_token: Annotated[str | None, Cookie(alias=config.COOKIE_ACCESS_NAME)] = None,
    kc_refresh_token: Annotated[str | None, Cookie(alias=config.COOKIE_REFRESH_NAME)] = None,
    service: OpportunitiesDigestService = Depends(get_opportunities_digest_service),
):
    """
    Add a single opportunity to the user's Google Calendar (all-day event on the deadline).
    """
    try:
        return await service.add_to_calendar(
            opportunity_id=id,
            kc_access_token=kc_access_token,
            kc_refresh_token=kc_refresh_token,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = status.HTTP_404_NOT_FOUND if "not found" in detail.lower() else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=detail)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=str(exc))
