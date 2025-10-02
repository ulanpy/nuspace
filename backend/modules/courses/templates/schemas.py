from datetime import datetime
from pydantic import BaseModel, Field
from typing import List, Optional
from fastapi import Query

from backend.common.schemas import ShortUserResponse
from backend.modules.courses.student_courses.schemas import BaseCourseItem


class BaseTemplateItem(BaseModel):
    id: int
    template_id: int
    item_name: str
    total_weight_pct: float | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BaseCourseTemplate(BaseModel):
    id: int
    course_id: int
    student_sub: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# === single item of the course ===
class TemplateItemCreate(BaseModel):
    item_name: str
    total_weight_pct: float | None

class TemplateItemUpdate(BaseModel):
    item_name: str
    total_weight_pct: float


# === template of the course ===
class TemplateCreate(BaseModel):
    course_id: int
    student_sub: str
    template_items: List[TemplateItemCreate | None] = []


class _TemplateCreateData(BaseModel):
    """Schema for creating CourseTemplate model (without template_items)."""
    course_id: int
    student_sub: str

class _TemplateItemCreateData(TemplateItemCreate):
    template_id: int


class TemplateUpdate(BaseModel):
    template_items: List[TemplateItemUpdate]


class TemplateResponse(BaseModel):
    template: BaseCourseTemplate
    template_items: List[BaseTemplateItem]
    student: ShortUserResponse

class ListTemplateDTO(BaseModel):
    templates: List[TemplateResponse]
    total_pages: int = Query(1, ge=1)


class TemplateImportResponse(BaseModel):
    student_course_id: int
    items: List[BaseCourseItem]