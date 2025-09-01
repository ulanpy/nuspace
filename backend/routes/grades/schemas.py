from typing import List, Optional

from pydantic import BaseModel


class ReportSection(BaseModel):
    section: Optional[str]
    course_title: Optional[str]
    faculty: Optional[str]
    grades_count: Optional[int]
    avg_gpa: Optional[float]
    median_gpa: Optional[float]
    std_dev: Optional[float]
    pct_A: Optional[float]
    pct_B: Optional[float]
    pct_C: Optional[float]
    pct_D: Optional[float]
    pct_F: Optional[float]


class OverallSummary(BaseModel):
    avg_gpa: Optional[float]
    total_count: int


class ReportsResponse(BaseModel):
    sections: List[ReportSection]
    overall: OverallSummary


class SearchItem(BaseModel):
    course_code: str
    course_title: Optional[str]
    faculty: Optional[str]
    total_count: int
    avg_gpa: Optional[float]


class SearchResponse(BaseModel):
    items: List[SearchItem]
    page: int
    size: int


class UploadSummary(BaseModel):
    imported: int
    skipped: int
    errors: List[dict]
