from __future__ import annotations

import base64
import json
from typing import Dict, List, Tuple, Optional

from fastapi import HTTPException, status

from backend.modules.courses.degree_audit.degree_audit import (
    REQUIREMENTS_BASE,
    audit_results_to_csv_string,
    audit_transcript,
    compute_credit_summary,
    discover_requirements_by_year,
    format_credit,
    load_requirements,
    requirement_for_major_year,
)
from backend.modules.courses.degree_audit.schemas import (
    AuditRequirementResult,
    AuditResponse,
    AuditSummary,
    CatalogResponse,
    CatalogYear,
    DegreeRequirement,
)
from backend.modules.courses.degree_audit.transcript_parser import (
    Transcript,
    parse_transcript,
    parse_transcript_bytes,
)
from backend.modules.courses.registrar.clients.registrar_client import RegistrarClient
from backend.core.database.models.degree_audit import DegreeAuditResult
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class DegreeAuditService:
    """
    Service wrapper for degree audit logic. Keeps requirements cached in memory and
    pulls transcripts directly from the registrar when credentials are provided.
    """

    def __init__(self, client_factory=RegistrarClient) -> None:
        self._client_factory = client_factory
        self._requirements_catalog: Dict[str, Dict[str, str]] | None = None
        self._requirements_cache: Dict[Tuple[str, str], List] = {}

    def _ensure_catalog(self) -> Dict[str, Dict[str, str]]:
        if self._requirements_catalog is None:
            self._requirements_catalog = discover_requirements_by_year(REQUIREMENTS_BASE)
        return self._requirements_catalog

    def list_catalog(self) -> CatalogResponse:
        catalog = self._ensure_catalog()
        years = [
            CatalogYear(year=year, majors=list(majors.keys()))
            for year, majors in catalog.items()
        ]
        return CatalogResponse(years=years)

    def get_requirements(
        self, *, year: str, major: str
    ) -> List[DegreeRequirement]:
        reqs = self._load_requirements(major, year)
        return [
            DegreeRequirement(
                course_code=req.course_code,
                course_name=req.course_name,
                credits_need=req.credits_need,
                min_grade=req.min_grade,
                comments=req.comments,
                options=req.options,
                must_haves=req.must_haves,
                excepts=req.excepts,
            )
            for req in reqs
        ]

    def _load_requirements(self, major: str, year: str) -> List:
        cache_key = (major, year)
        if cache_key in self._requirements_cache:
            return self._requirements_cache[cache_key]

        catalog = self._ensure_catalog()
        path = requirement_for_major_year(major, year, catalog)
        if not path:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="requirements_not_found",
            )

        requirements = load_requirements(
            path, special_dir=REQUIREMENTS_BASE / "additional_tables", admission_year=year
        )
        self._requirements_cache[cache_key] = requirements
        return requirements

    async def audit_with_registrar(
        self,
        *,
        year: str,
        major: str,
        username: str,
        password: str,
        student_sub: str,
        session: AsyncSession,
    ) -> AuditResponse:
        transcript = await self._fetch_transcript_from_registrar(username, password)
        response = self._run_audit(transcript, year=year, major=major)
        await self._save_result(
            session=session,
            student_sub=student_sub,
            year=year,
            major=major,
            response=response,
        )
        return response

    async def get_cached_result(
        self,
        *,
        student_sub: str,
        session: AsyncSession,
        year: Optional[str] = None,
        major: Optional[str] = None,
    ) -> Optional[AuditResponse]:
        stmt = select(DegreeAuditResult).where(DegreeAuditResult.student_sub == student_sub)
        if year:
            stmt = stmt.where(DegreeAuditResult.admission_year == year)
        if major:
            stmt = stmt.where(DegreeAuditResult.major == major)
        stmt = stmt.order_by(DegreeAuditResult.updated_at.desc())
        result = await session.execute(stmt)
        row: DegreeAuditResult | None = result.scalars().first()
        if not row:
            return None
        return AuditResponse(
            year=row.admission_year,
            major=row.major,
            results=row.results,
            summary=row.summary,
            warnings=row.warnings or [],
            csv_base64=row.csv_base64,
        )

    async def _fetch_transcript_from_registrar(self, username: str, password: str) -> Transcript:
        try:
            async with self._client_factory() as client:
                pdf_bytes = await client.fetch_unofficial_transcript_pdf(username, password)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="transcript_not_pdf_or_auth_failed",
            )

        try:
            return parse_transcript_bytes(pdf_bytes)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="invalid_transcript_pdf",
            )

    def _run_audit(
        self, transcript: Transcript, *, year: str, major: str
    ) -> AuditResponse:
        requirements = self._load_requirements(major, year)
        audit_results = audit_transcript(transcript, requirements, expected_major=major)
        summary_raw = compute_credit_summary(transcript, requirements, audit_results)

        results_out = [
            AuditRequirementResult(
                course_code=res.requirement.course_code,
                course_name=res.requirement.course_name,
                credits_required=format_credit(res.requirement.credits_need),
                min_grade=res.requirement.min_grade,
                status=res.status,
                used_courses="; ".join(res.used_courses),
                credits_applied=format_credit(res.credits_applied),
                credits_remaining=format_credit(res.credits_remaining),
                note=res.note or res.requirement.comments,
            )
            for res in audit_results
        ]
        summary = AuditSummary(**summary_raw) if summary_raw else None

        csv_data = audit_results_to_csv_string(audit_results, summary=summary_raw)
        csv_b64 = base64.b64encode(csv_data.encode("utf-8")).decode("ascii")

        return AuditResponse(
            year=year,
            major=major,
            results=results_out,
            summary=summary,
            warnings=[],
            csv_base64=csv_b64,
        )

    async def _save_result(
        self,
        *,
        session: AsyncSession,
        student_sub: str,
        year: str,
        major: str,
        response: AuditResponse,
    ) -> None:
        existing_stmt = select(DegreeAuditResult).where(
            DegreeAuditResult.student_sub == student_sub,
            DegreeAuditResult.admission_year == year,
            DegreeAuditResult.major == major,
        )
        result = await session.execute(existing_stmt)
        row: DegreeAuditResult | None = result.scalars().first()
        payload = dict(
            student_sub=student_sub,
            admission_year=year,
            major=major,
            results=[r.model_dump() for r in response.results],  # type: ignore[arg-type]
            summary=response.summary.model_dump() if response.summary else None,
            warnings=response.warnings,
            csv_base64=response.csv_base64,
        )
        if row:
            for k, v in payload.items():
                setattr(row, k, v)
        else:
            row = DegreeAuditResult(**payload)
            session.add(row)
        await session.commit()


def _try_b64(value: str) -> bytes | None:
    try:
        return base64.b64decode(value, validate=True)
    except Exception:
        return None

