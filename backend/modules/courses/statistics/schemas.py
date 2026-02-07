from datetime import datetime
from typing import List
from pydantic import BaseModel, Field


class BaseGradeReportSchema(BaseModel):
    id: int
    course_code: str
    course_title: str | None
    section: str | None
    term: str | None
    grades_count: int | None
    avg_gpa: float | None
    std_dev: float | None
    median_gpa: float | None
    pct_A: float | None
    pct_B: float | None
    pct_C: float | None
    pct_D: float | None
    pct_F: float | None
    pct_P: float | None
    pct_I: float | None
    pct_AU: float | None
    pct_W_AW: float | None
    letters_count: int | None
    faculty: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ListGradeReportResponse(BaseModel):
    items: List[BaseGradeReportSchema] = Field(default_factory=list)
    total_pages: int = Field(default=1, ge=1)
    total: int
    page: int
    size: int
    has_next: bool


class ListGradeTermsResponse(BaseModel):
    terms: List[str] = Field(default_factory=list)

