from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB

from .base import Base


class DegreeAuditResult(Base):
    __tablename__ = "degree_audit_results"
    __table_args__ = (
        UniqueConstraint("student_sub", "admission_year", "major", name="uq_degree_audit_user_year_major"),
    )

    id = Column(Integer, primary_key=True)
    student_sub = Column(String, ForeignKey("users.sub", ondelete="CASCADE"), nullable=False, index=True)
    admission_year = Column(String(16), nullable=False)
    major = Column(String(256), nullable=False)
    results = Column(JSONB, nullable=False)
    summary = Column(JSONB, nullable=True)
    warnings = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    csv_base64 = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=text("NOW()"))
    updated_at = Column(DateTime, nullable=False, server_default=text("NOW()"), onupdate=datetime.utcnow)


