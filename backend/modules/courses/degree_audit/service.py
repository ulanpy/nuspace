from __future__ import annotations

import base64
import json
from typing import Dict, List, Optional, Tuple

from backend.core.database.models.degree_audit import DegreeAuditResult
from backend.modules.courses.degree_audit.degree_audit import (
    REQUIREMENTS_BASE,
    apply_transfer_credit_mappings,
    audit_results_to_csv_string,
    audit_transcript,
    compute_credit_summary,
    format_credit,
    list_transfer_credit_lines,
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
    TCCourse,
    TCMapping,
)
from backend.modules.courses.degree_audit.transcript_parser import (
    Transcript,
    parse_transcript_bytes,
)
from backend.modules.courses.registrar.clients.registrar_client import RegistrarClient
from fastapi import HTTPException, status
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
        self._minor_requirements_catalog: Dict[str, str] | None = None
        self._requirements_cache: Dict[Tuple[str, str], List] = {}
        self._minor_requirements_cache: Dict[str, List] = {}

    def _ensure_catalog(self) -> Dict[str, Dict[str, str]]:
        if self._requirements_catalog is None:
            from backend.modules.courses.degree_audit.degree_audit import (
                discover_requirements_by_year,
            )
            self._requirements_catalog = discover_requirements_by_year(REQUIREMENTS_BASE)
        return self._requirements_catalog

    def _ensure_minor_catalog(self) -> Dict[str, str]:
        if self._minor_requirements_catalog is None:
            from backend.modules.courses.degree_audit.degree_audit import (
                discover_minor_requirements,
            )
            self._minor_requirements_catalog = discover_minor_requirements(REQUIREMENTS_BASE)
        return self._minor_requirements_catalog

    def list_catalog(self) -> CatalogResponse:
        catalog = self._ensure_catalog()
        minor_catalog = self._ensure_minor_catalog()
        years = [
            CatalogYear(year=year, majors=list(majors.keys()))
            for year, majors in catalog.items()
        ]
        minors = list(minor_catalog.keys())
        return CatalogResponse(years=years, minors=minors)

    def get_requirements(
        self, *, year: str, name: str, type: str = "major"
    ) -> List[DegreeRequirement]:
        try:
            if type == "minor":
                reqs = self._load_minor_requirements(name)
            else:
                reqs = self._load_requirements(name, year)
        except Exception:
            if type == "major":
                # Fallback just in case
                reqs = self._load_minor_requirements(name)
            else:
                raise
            
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
        majors: List[str],
        minors: List[str],
        username: str,
        password: str,
        student_sub: str,
        session: AsyncSession,
        tc_mappings: List[TCMapping] | None = None,
    ) -> AuditResponse:
        transcript = await self._fetch_transcript_from_registrar(username, password)
        work, unmapped_tc = self._transcript_with_tc_mappings(transcript, tc_mappings or [])
        response = self._run_audits(work, year=year, majors=majors, minors=minors)
        response.unmapped_tc_courses = unmapped_tc
        await self._save_result(
            session=session,
            student_sub=student_sub,
            year=year,
            majors=majors,
            minors=minors,
            response=response,
        )
        return response

    async def audit_with_pdf(
        self,
        *,
        year: str,
        majors: List[str],
        minors: List[str],
        pdf_file: bytes,
        student_sub: str,
        session: AsyncSession,
        tc_mappings: List[TCMapping] | None = None,
    ) -> AuditResponse:
        try:
            transcript = parse_transcript_bytes(_normalize_pdf_bytes(pdf_file))
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="invalid_transcript_pdf",
            )
        work, unmapped_tc = self._transcript_with_tc_mappings(transcript, tc_mappings or [])
        response = self._run_audits(work, year=year, majors=majors, minors=minors)
        response.unmapped_tc_courses = unmapped_tc
        await self._save_result(
            session=session,
            student_sub=student_sub,
            year=year,
            majors=majors,
            minors=minors,
            response=response,
        )
        return response

    def _transcript_with_tc_mappings(
        self, transcript: Transcript, tc_mappings: List[TCMapping]
    ) -> Tuple[Transcript, List[TCCourse]]:
        if tc_mappings:
            work = apply_transfer_credit_mappings(transcript, tc_mappings)
        else:
            work = transcript
        unmapped = [
            TCCourse(code=c, title=t, credits=cr) for c, t, cr in list_transfer_credit_lines(work)
        ]
        return work, unmapped

    async def _fetch_transcript_from_registrar(self, username: str, password: str) -> Transcript:
        async with self._client_factory() as client:
            pdf_bytes = await client.fetch_unofficial_transcript_pdf(username, password)
        return parse_transcript_bytes(_normalize_pdf_bytes(pdf_bytes))

    def _load_minor_requirements(self, minor: str) -> List:
        if minor in self._minor_requirements_cache:
            return self._minor_requirements_cache[minor]

        minor_catalog = self._ensure_minor_catalog()
        path = minor_catalog.get(minor)
        if not path:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="requirements_not_found",
            )

        from backend.modules.courses.degree_audit.degree_audit import load_requirements
        requirements = load_requirements(
            path, special_dir=REQUIREMENTS_BASE / "additional_tables", admission_year="2025"
        )
        self._minor_requirements_cache[minor] = requirements
        return requirements

    def _run_audits(
        self, transcript: Transcript, *, year: str, majors: List[str], minors: List[str]
    ) -> AuditResponse:
        from backend.modules.courses.degree_audit.schemas import AuditProgramResult
        audits = []
        csv_b64 = None

        for major in majors:
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

            if csv_b64 is None:
                csv_data = audit_results_to_csv_string(audit_results, summary=summary_raw)
                csv_b64 = base64.b64encode(csv_data.encode("utf-8")).decode("ascii")

            audits.append(AuditProgramResult(
                name=major,
                type="major",
                results=results_out,
                summary=summary,
                warnings=[],
            ))

        for minor in minors:
            requirements = self._load_minor_requirements(minor)
            audit_results = audit_transcript(transcript, requirements, expected_major=minor)
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

            audits.append(AuditProgramResult(
                name=minor,
                type="minor",
                results=results_out,
                summary=summary,
                warnings=[],
            ))

        return AuditResponse(
            year=year,
            majors=majors,
            minors=minors,
            audits=audits,
            csv_base64=csv_b64,
        )

    async def _save_result(
        self,
        *,
        session: AsyncSession,
        student_sub: str,
        year: str,
        majors: List[str],
        minors: List[str],
        response: AuditResponse,
    ) -> None:
        major_key = json.dumps({"majors": majors, "minors": minors}, sort_keys=True)
        existing_stmt = select(DegreeAuditResult).where(
            DegreeAuditResult.student_sub == student_sub,
            DegreeAuditResult.admission_year == year,
            DegreeAuditResult.major == major_key,
        )
        result = await session.execute(existing_stmt)
        row: DegreeAuditResult | None = result.scalars().first()
        payload = dict(
            student_sub=student_sub,
            admission_year=year,
            major=major_key,
            results=[r.model_dump() for r in response.audits],
            summary=None,
            warnings=[],
            csv_base64=response.csv_base64,
        )
        if row:
            for k, v in payload.items():
                setattr(row, k, v)
        else:
            row = DegreeAuditResult(**payload)
            session.add(row)
        await session.commit()

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
        
        try:
            parsed = json.loads(row.major)
            majors = parsed.get("majors", [])
            minors = parsed.get("minors", [])
        except Exception:
            majors = [row.major]
            minors = []

        from backend.modules.courses.degree_audit.schemas import AuditProgramResult
        
        if row.results and isinstance(row.results, list) and len(row.results) > 0 and "name" in row.results[0]:
            audits = [AuditProgramResult(**a) for a in row.results]
        else:
            audits = [AuditProgramResult(
                name=row.major,
                type="major",
                results=[AuditRequirementResult(**r) for r in row.results] if row.results else [],
                summary=AuditSummary(**row.summary) if row.summary else None,
                warnings=row.warnings or [],
            )]
            
        return AuditResponse(
            year=row.admission_year,
            majors=majors,
            minors=minors,
            audits=audits,
            csv_base64=row.csv_base64,
        )


def _normalize_pdf_bytes(pdf_bytes: bytes) -> bytes:
    """Normalize JSON/base64 payloads into raw PDF bytes for parsing.

    When the frontend posts JSON, the PDF is base64-encoded and arrives as bytes
    that begin with the base64 header (e.g. b"JVBER"). This helper decodes
    base64 when needed so the parser always receives bytes starting with b"%PDF".
    """
    if pdf_bytes.startswith(b"%PDF"):
        return pdf_bytes
    decoded = _try_b64(pdf_bytes)
    if decoded and decoded.startswith(b"%PDF"):
        return decoded
    return pdf_bytes


def _try_b64(value: bytes | str) -> bytes | None:
    """Best-effort base64 decode helper for PDF payloads."""
    try:
        return base64.b64decode(value, validate=True)
    except Exception:
        return None

