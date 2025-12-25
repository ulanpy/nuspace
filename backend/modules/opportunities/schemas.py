from datetime import date, datetime
from typing import Optional, List

from pydantic import BaseModel, field_validator
from pydantic import Field
from fastapi import Query


class OpportunityBase(BaseModel):
    name: str = Field(..., max_length=512)
    description: str | None = None
    deadline: date | None = None
    steps: str | None = None
    host: str | None = None
    type: str | None = None
    majors: str | None = None
    link: str | None = None
    location: str | None = None
    eligibility: str | None = None
    funding: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @field_validator("link")
    def normalize_link(cls, v):
        if v is None:
            return v
        link = v.strip()
        if not link:
            return None
        if not link.startswith(("http://", "https://")):
            link = f"https://{link}"
        return link


class OpportunityCreate(OpportunityBase):
    @field_validator("deadline")
    def validate_deadline(cls, v):
        if v is not None and v < date.today():
            raise ValueError("Deadline cannot be in the past")
        return v


class OpportunityUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    deadline: date | None = None
    steps: str | None = None
    host: str | None = None
    type: str | None = None
    majors: str | None = None
    link: str | None = None
    location: str | None = None
    eligibility: str | None = None
    funding: str | None = None

    class Config:
        from_attributes = True


class OpportunityResponse(OpportunityBase):
    id: int


class OpportunityListResponse(BaseModel):
    items: List[OpportunityResponse]
    total: int
    page: int
    size: int
    total_pages: int
    has_next: bool


class OpportunityFilter(BaseModel):
    type: str | None = Query(default=None, description="Filter by opportunity type")
    majors: str | None = Query(default=None, description="Filter by majors substring")
    eligibility: str | None = Query(default=None, description="Filter by eligibility")
    q: str | None = Query(default=None, description="Search in name/description")
    hide_expired: bool = Query(default=False, description="Hide expired opportunities")
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)")
    size: int = Query(default=15, ge=1, le=1000, description="Page size")
