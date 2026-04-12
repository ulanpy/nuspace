from __future__ import annotations

from typing import Annotated

from backend.common.dependencies import get_creds_or_401, get_db_session
from backend.core.configs.config import config
from backend.modules.courses.degree_audit.dependencies import get_degree_audit_service
from backend.modules.courses.degree_audit.schemas import (
    AuditRequestPDF,
    AuditRequestRegistrar,
    AuditResponse,
    CatalogResponse,
    DegreeRequirement,
)
from backend.modules.courses.degree_audit.service import DegreeAuditService
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/degree-audit", tags=["Degree Audit"])


@router.get(
    "/catalog",
    response_model=CatalogResponse,
    summary="List available admission years and majors for degree audit",
)
async def list_catalog(
    _creds: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    service: DegreeAuditService = Depends(get_degree_audit_service),
) -> CatalogResponse:
    return service.list_catalog()


@router.post(
    "/audit/registrar",
    response_model=AuditResponse,
    summary="Run degree audit using registrar transcript (no file upload)",
    status_code=status.HTTP_200_OK,
)
async def audit_from_registrar(
    payload: AuditRequestRegistrar,
    _creds: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
    service: DegreeAuditService = Depends(get_degree_audit_service),
) -> AuditResponse:
    return await service.audit_with_registrar(
        year=payload.year,
        majors=payload.majors,
        minors=payload.minors,
        username=payload.username if not config.IS_DEBUG else "bauyrzhan.kizatov",
        password=payload.password,
        student_sub=_creds[1]["sub"],
        session=db_session,
        tc_mappings=payload.tc_mappings,
    )


@router.post(
    "/audit/pdf",
    response_model=AuditResponse,
    summary="Run degree audit using PDF file",
    status_code=status.HTTP_200_OK,
)
async def audit_from_pdf(
    payload: AuditRequestPDF,
    _creds: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
    service: DegreeAuditService = Depends(get_degree_audit_service),
) -> AuditResponse:
    return await service.audit_with_pdf(
        year=payload.year,
        majors=payload.majors,
        minors=payload.minors,
        pdf_file=payload.pdf_file,
        student_sub=_creds[1]["sub"],
        session=db_session,
        tc_mappings=payload.tc_mappings,
    )


@router.get(
    "/requirements",
    response_model=list[DegreeRequirement],
    summary="Get degree requirements for a specific year and major",
)
async def get_degree_requirements(
    year: str,
    name: str,
    type: str = "major",
    _creds: Annotated[tuple[dict, dict], Depends(get_creds_or_401)] = None,
    service: DegreeAuditService = Depends(get_degree_audit_service),
) -> list[DegreeRequirement]:
    return service.get_requirements(year=year, name=name, type=type)


@router.get(
    "/result",
    response_model=AuditResponse | None,
    summary="Get cached degree audit result for current user",
)
async def get_cached_result(
    year: str | None = None,
    major: str | None = None,
    _creds: Annotated[tuple[dict, dict], Depends(get_creds_or_401)] = None,
    db_session: AsyncSession = Depends(get_db_session),
    service: DegreeAuditService = Depends(get_degree_audit_service),
) -> AuditResponse | None:
    return await service.get_cached_result(
        student_sub=_creds[1]["sub"],
        session=db_session,
        year=year,
        major=major,
    )

