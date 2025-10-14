from typing import Dict, List, Optional
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


class SyncRequest(BaseModel):
    password: str = Field(min_length=1)


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


class CourseSearchResponse(BaseModel):
    items: List[CourseSummary]
    cursor: Optional[int] = None


class CourseSearchRequest(BaseModel):
    query: str | None = None
    term: str | None = None
    level: Optional[str] = None
    page: int = Field(default=1, ge=1)


class CourseDetailResponse(CourseSummary):
    pass


class CourseSchedule(BaseModel):
    capacity: str
    days: str
    enr: int
    faculty: str
    final_exam: bool
    id: str
    room: str
    st: str
    times: str


class CourseSchedulesResponse(BaseModel):
    schedules: Dict[str, List[CourseSchedule]]


class CourseSchedulesRequest(BaseModel):
    course_ids: List[str] = Field(default_factory=list, min_items=1)
    term: str

