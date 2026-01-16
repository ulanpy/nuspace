from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


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

class AuditRequestPDF(BaseModel):
    year: str
    major: str
    pdf_file: bytes = Field(
        ...,
        description="Base64-encoded PDF payload (decoded into bytes by Pydantic).",
        max_length=10 * 1024 * 1024,
    )

    @field_validator("pdf_file")
    def validate_pdf_file_size(cls, value: bytes) -> bytes:
        max_bytes = 10 * 1024 * 1024
        if len(value) > max_bytes:
            raise ValueError("pdf_file_too_large")
        return value

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

