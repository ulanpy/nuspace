from __future__ import annotations

from backend.modules.courses.degree_audit.service import DegreeAuditService

_degree_audit_service: DegreeAuditService | None = None


async def get_degree_audit_service() -> DegreeAuditService:
    global _degree_audit_service
    if _degree_audit_service is None:
        _degree_audit_service = DegreeAuditService()
    return _degree_audit_service
