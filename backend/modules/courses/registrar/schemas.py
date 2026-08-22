from typing import List, Optional

from pydantic import BaseModel, Field


class TimeSchema(BaseModel):
    hh: int = Field(ge=0, le=23)
    mm: int = Field(ge=0, le=59)


class ScheduleTimeSchema(BaseModel):
    start: TimeSchema
    end: TimeSchema


class UserScheduleItem(BaseModel):
    label: str
    title: str
    info: str
    teacher: str
    cab: str
    course_code: str
    time: ScheduleTimeSchema


class SchedulePreferences(BaseModel):
    classes: List[str]
    colors: dict[str, str]


class ScheduleResponse(BaseModel):
    data: List[List[UserScheduleItem]]
    preferences: SchedulePreferences


class SemesterOption(BaseModel):
    label: str
    value: str


class CourseSummary(BaseModel):
    catalog_id: str
    course_code: str
    pre_req: str
    anti_req: str
    co_req: str
    level: Optional[str] = None
    school: Optional[str] = None
    title: str
    credits: Optional[str] = None
    term: Optional[str] = None
    priority_1: Optional[str] = None
    priority_2: Optional[str] = None
    priority_3: Optional[str] = None
    priority_4: Optional[str] = None


class CatalogCourse(BaseModel):
    """A term-specific offering from the Meilisearch schedule catalog."""

    catalog_id: str
    course_code: str
    term: str
    term_id: str
    title: str | None = None
    school: str | None = None
    level: str | None = None
    credits_ects: float | None = None
    prerequisite: str | None = None
    corequisite: str | None = None
    antirequisite: str | None = None


class CourseSearchResponse(BaseModel):
    items: List[CourseSummary]
    cursor: Optional[int] = None


class CourseSearchRequest(BaseModel):
    course_code: str | None = None
    term: str
    size: int = Field(default=5, ge=1, le=20)
    page: int = Field(default=1, ge=1)


class CourseScheduleEntry(BaseModel):
    section_code: str
    days: str
    times: str
    room: Optional[str] = None
    faculty: Optional[str] = None
    capacity: Optional[int] = None
    enrollment: Optional[int] = None
    instance_id: Optional[str] = None
