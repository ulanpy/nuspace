from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class AuditSummary(BaseModel):
    total_required: str = Field(..., description="Total credits required by the plan")
    total_applied: str = Field(..., description="Credits applied toward requirements")
    total_remaining: str = Field(..., description="Credits still needed")
    total_taken: str = Field(..., description="Credits taken on transcript")


class AuditRequirementResult(BaseModel):
    course_code: str
    course_name: str
    credits_required: str
    min_grade: str
    status: str
    used_courses: str
    credits_applied: str
    credits_remaining: str
    note: str


class AuditResponse(BaseModel):
    year: str
    major: str
    results: List[AuditRequirementResult]
    summary: Optional[AuditSummary] = None
    warnings: List[str] = []
    csv_base64: Optional[str] = Field(
        None, description="Optional base64 CSV of the audit results"
    )


class AuditRequestRegistrar(BaseModel):
    year: str
    major: str
    username: str
    password: str


class CatalogYear(BaseModel):
    year: str
    majors: List[str]


class CatalogResponse(BaseModel):
    years: List[CatalogYear]


class DegreeRequirement(BaseModel):
    course_code: str
    course_name: str
    credits_need: float
    min_grade: str
    comments: str
    options: List[str]
    must_haves: List[str]
    excepts: List[str]

