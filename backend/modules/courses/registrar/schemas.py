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
    registrar_id: str
    course_code: str
    pre_req: str
    anti_req: str
    co_req: str
    level: str
    school: str
    description: Optional[str] = None
    department: str
    title: str
    credits: str
    term: str
    priority_1: Optional[str] = None
    priority_2: Optional[str] = None
    priority_3: Optional[str] = None
    priority_4: Optional[str] = None


class CourseSearchResponse(BaseModel):
    items: List[CourseSummary]
    cursor: Optional[int] = None


class CourseSearchRequest(BaseModel):
    course_code: str | None = None
    term: str
    page: int = Field(default=1, ge=1)


class CourseScheduleEntry(BaseModel):
    section_code: str
    days: str
    times: str
    room: Optional[str] = None
    faculty: Optional[str] = None
    capacity: Optional[int] = None
    enrollment: Optional[int] = None
    final_exam: bool = False
    instance_id: Optional[str] = None
