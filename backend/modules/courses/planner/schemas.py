from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class PlannerCourseAddRequest(BaseModel):
    course_code: str = Field(..., min_length=1, max_length=128)
    term_value: str = Field(..., min_length=1, max_length=32)
    term_label: Optional[str] = Field(default=None, max_length=64)
    level: Optional[str] = Field(default=None, max_length=64)


class PlannerSectionResponse(BaseModel):
    id: int
    section_code: str
    days: str
    times: str
    room: Optional[str] = None
    faculty: Optional[str] = None
    capacity: Optional[int] = None
    enrollment_snapshot: Optional[int] = None
    is_selected: bool
    selected_count: int


class PlannerCourseResponse(BaseModel):
    id: int
    registrar_course_id: str
    course_code: str
    level: Optional[str]
    school: Optional[str]
    term_value: Optional[str]
    term_label: Optional[str]
    capacity_total: Optional[int]
    sections: List[PlannerSectionResponse]
    pre_req: Optional[str] = None
    co_req: Optional[str] = None
    anti_req: Optional[str] = None
    priority_1: Optional[str] = None
    priority_2: Optional[str] = None
    priority_3: Optional[str] = None
    priority_4: Optional[str] = None


class PlannerScheduleResponse(BaseModel):
    id: int
    courses: List[PlannerCourseResponse]


class PlannerSectionSelectionRequest(BaseModel):
    section_ids: List[int] = Field(default_factory=list)


class PlannerResetRequest(BaseModel):
    term_value: Optional[str] = None


class PlannerCourseSearchResult(BaseModel):
    course_code: str
    title: str
    pre_req: str
    anti_req: str
    co_req: str
    level: Optional[str] = None
    school: Optional[str] = None
    credits: Optional[str] = None
    term: Optional[str] = None
    priority_1: Optional[str] = None
    priority_2: Optional[str] = None
    priority_3: Optional[str] = None
    priority_4: Optional[str] = None


class PlannerCourseSearchResponse(BaseModel):
    items: List[PlannerCourseSearchResult]
    cursor: Optional[int] = None


class AutoBuildCourseResult(BaseModel):
    course_id: int
    registrar_course_id: str
    course_code: str
    selected_section_id: Optional[int]
    selected_section_code: Optional[str]
    selected_section_ids: List[int] = Field(default_factory=list)


class PlannerAutoBuildResponse(BaseModel):
    scheduled: List[AutoBuildCourseResult]
    unscheduled_courses: List[str]
    message: str

