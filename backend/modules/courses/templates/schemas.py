from datetime import datetime
from pydantic import BaseModel, Field
from typing import List
from fastapi import Query


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

class TemplateItem(BaseModel):
    item_name: str = Field(max_length=256, description="Name of the template item")
    total_weight_pct: float | None = Field(
        default=None,
        ge=0,
        le=100,
        description="Weight must be between 0-100%",
    )

class TemplateItemCreate(BaseModel):
    course_item_id: int

class TemplateCreate(BaseModel):
    course_id: int
    template_items: List[TemplateItemCreate]

class TemplateResponse(BaseModel):
    template: BaseCourseTemplate
    template_items: List[TemplateItem]

class ListTemplateDTO(BaseModel):
    templates: List[TemplateResponse]
    total_pages: int = Query(1, ge=1)


