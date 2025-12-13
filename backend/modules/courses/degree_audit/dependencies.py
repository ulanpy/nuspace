from __future__ import annotations

from functools import lru_cache

from backend.modules.courses.degree_audit.service import DegreeAuditService


@lru_cache(maxsize=1)
def get_degree_audit_service() -> DegreeAuditService:
    return DegreeAuditService()

