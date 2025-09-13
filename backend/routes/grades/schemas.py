from datetime import datetime
from typing import List

from fastapi import Query
from pydantic import BaseModel, Field

from backend.core.database.models.grade_report import LevelType, SchoolType


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


class BaseCourseSchema(BaseModel):
    id: int
    school: SchoolType
    level: LevelType
    course_code: str
    section: str
    credits: int
    term: str
    faculty: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BaseCourseItem(BaseModel):
    id: int
    student_course_id: int
    item_name: str
    total_weight_pct: float | None
    obtained_score_pct: float | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RegisteredCourseResponse(BaseModel):
    id: int
    course: BaseCourseSchema
    items: List[BaseCourseItem]
    class_average: float | None = None

    class Config:
        from_attributes = True


class RegisteredCourseCreate(BaseModel):
    course_id: int
    student_sub: str | None = None


class CourseItemCreate(BaseModel):
    student_course_id: int = Field(description="ID of the student's registered course")
    item_name: str = Field(
        description="Name of the assignment/exam",
        max_length=256,
    )
    total_weight_pct: float | None = Field(
        default=None,
        ge=0,
        le=100,
        description="Weight must be between 0-100%",
    )
    obtained_score_pct: float = Field(
        ge=0,
        le=100,
        description="Score must be between 0-100%",
    )


class CourseItemUpdate(BaseModel):
    item_name: str | None = Field(
        description="Name of the assignment/exam",
        max_length=256,
        default=None,
    )
    total_weight_pct: float | None = Field(
        ge=0,
        le=100,
        description="Weight must be between 0-100%",
        default=None,
    )
    obtained_score_pct: float | None = Field(
        ge=0,
        le=100,
        description="Score must be between 0-100%",
        default=None,
    )


class ListBaseCourseResponse(BaseModel):
    courses: List[BaseCourseSchema]
    total_pages: int = Query(1, ge=1)

    class Config:
        from_attributes = True
