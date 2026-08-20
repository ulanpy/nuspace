from fastapi import Depends, Query, Request

from backend.common.dependencies import get_infra, get_uow
from backend.common.schemas import Infra
from backend.core.database.uow import UnitOfWork
from backend.modules.auth.keycloak_manager import KeyCloakManager
from backend.modules.calendar.google_calendar_service import GoogleCalendarService
from backend.modules.opportunities import schemas
from backend.modules.opportunities.service import OpportunitiesDigestService


async def get_opportunity_filters(
    type: list[schemas.OpportunityType] | None = Query(
        default=None, description="Filter by opportunity types"
    ),
    majors: list[schemas.OpportunityMajor] | None = Query(
        default=None, description="Filter by majors"
    ),
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


async def get_opportunities_digest_service(
    request: Request,
    uow: UnitOfWork = Depends(get_uow),
    infra: Infra = Depends(get_infra),
) -> OpportunitiesDigestService:
    kc_manager: KeyCloakManager | None = request.app.state.kc_manager if request else None
    calendar_service = GoogleCalendarService(kc_manager=kc_manager) if kc_manager else None
    return OpportunitiesDigestService(
        uow=uow,
        meilisearch_client=infra.meilisearch_client,
        calendar_sync=calendar_service,
    )
