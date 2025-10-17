from datetime import datetime
from typing import List

from fastapi import Query
from pydantic import BaseModel, Field



class CourseCreate(BaseModel):
    registrar_id: int
    course_code: str
    pre_req: str | None = None
    anti_req: str | None = None
    co_req: str | None = None
    level: str
    school: str
    description: str | None = None
    department: str | None = None
    title: str | None = None
    credits: int | None = None
    term: str | None = None


class BaseCourseSchema(BaseModel):
    id: int
    registrar_id: int
    course_code: str
    pre_req: str | None
    anti_req: str | None
    co_req: str | None
    level: str
    school: str
    description: str | None
    department: str | None
    title: str | None
    credits: int | None
    term: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BaseCourseItem(BaseModel):
    id: int
    student_course_id: int
    item_name: str
    total_weight_pct: float | None
    obtained_score: float | None
    max_score: float | None
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
    obtained_score: float | None = Field(
        ge=0,
        le=99999.99,
        description="Score must be between 0 and 99999.99",
        default=None,
    )
    max_score: float | None = Field(
        ge=0,
        le=99999.99,
        description="Score must be between 0 and 99999.99",
        default=None,
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
    obtained_score: float | None = Field(
        ge=0,
        le=99999.99,
        description="Score must be between 0 and 99999.99",
        default=None,
    )
    max_score: float | None = Field(
        ge=0,
        le=99999.99,
        description="Score must be between 0 and 99999.99",
        default=None,
    )


class ListBaseCourseResponse(BaseModel):
    courses: List[BaseCourseSchema]
    total_pages: int = Query(1, ge=1)

    class Config:
        from_attributes = True


class RegistrarSyncRequest(BaseModel):
    password: str = Field(min_length=1, description="Registrar password")


class RegistrarSyncResponse(BaseModel):
    synced_courses: List[RegisteredCourseResponse]
    total_synced: int
    added_count: int
    deleted_count: int
    kept_count: int

