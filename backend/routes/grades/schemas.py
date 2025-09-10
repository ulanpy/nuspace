from datetime import datetime
from typing import List

from fastapi import Query
from pydantic import BaseModel


class BaseGradeReportSchema(BaseModel):
    id: int
    course_code: str
    course_title: str
    section: str
    term: str
    grades_count: int
    avg_gpa: float
    std_dev: float
    median_gpa: float
    pct_A: float
    pct_B: float
    pct_C: float
    pct_D: float
    pct_F: float
    pct_P: float
    pct_I: float
    pct_AU: float
    pct_W_AW: float
    letters_count: int
    faculty: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ListGradeReportResponse(BaseModel):
    grades: List[BaseGradeReportSchema] = []
    total_pages: int = Query(1, ge=1)
