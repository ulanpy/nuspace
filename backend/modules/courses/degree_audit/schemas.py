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


class AuditProgramResult(BaseModel):
    name: str
    type: str
    results: List[AuditRequirementResult]
    summary: Optional[AuditSummary] = None
    warnings: List[str] = []

class TCMapping(BaseModel):
    original_code: str = Field(
        ...,
        description="Transfer course code from transcript. Code only.",
        examples=["HST 152"],
    )
    mapped_code: str = Field(
        ...,
        description="NU course code. Use department + space + number, e.g. HST 152.",
        examples=["HST 152"],
    )
    mapped_credits: float

class TCCourse(BaseModel):
    code: str
    title: str
    credits: float

class AuditResponse(BaseModel):
    year: str
    majors: List[str] = []
    minors: List[str] = []
    audits: List[AuditProgramResult] = []
    unmapped_tc_courses: List[TCCourse] = []
    csv_base64: Optional[str] = Field(
        None, description="Optional base64 CSV of the audit results"
    )

class AuditRequestRegistrar(BaseModel):
    year: str
    majors: List[str]
    minors: List[str] = []
    username: str
    password: str
    tc_mappings: List[TCMapping] = []

class AuditRequestPDF(BaseModel):
    year: str
    majors: List[str]
    minors: List[str] = []
    tc_mappings: List[TCMapping] = []
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
    minors: List[str] = []


class DegreeRequirement(BaseModel):
    course_code: str
    course_name: str
    credits_need: float
    min_grade: str
    comments: str
    options: List[str]
    must_haves: List[str]
    excepts: List[str]
