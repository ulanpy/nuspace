from datetime import date
from typing import Optional, List

from pydantic import BaseModel, HttpUrl, field_validator
from pydantic import Field
from fastapi import Query


class OpportunityDigestBase(BaseModel):
    name: str = Field(..., max_length=512)
    description: Optional[str] = None
    deadline: Optional[date] = None
    steps: Optional[str] = None
    host: Optional[str] = Field(default=None, max_length=256)
    type: Optional[str] = Field(default=None, max_length=128)
    majors: Optional[str] = Field(default=None, max_length=512)
    link: Optional[str] = None
    location: Optional[str] = Field(default=None, max_length=256)
    eligibility: Optional[str] = None
    funding: Optional[str] = Field(default=None, max_length=256)

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


class OpportunityDigestCreate(OpportunityDigestBase):
    @field_validator("deadline")
    def validate_deadline(cls, v):
        if v is not None and v < date.today():
            raise ValueError("Deadline cannot be in the past")
        return v


class OpportunityDigestUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=512)
    description: Optional[str] = None
    deadline: Optional[date] = None
    steps: Optional[str] = None
    host: Optional[str] = Field(default=None, max_length=256)
    type: Optional[str] = Field(default=None, max_length=128)
    majors: Optional[str] = Field(default=None, max_length=512)
    link: Optional[str] = None
    location: Optional[str] = Field(default=None, max_length=256)
    eligibility: Optional[str] = None
    funding: Optional[str] = Field(default=None, max_length=256)

    class Config:
        from_attributes = True


class OpportunityDigestResponse(OpportunityDigestBase):
    id: int


class OpportunityDigestListResponse(BaseModel):
    items: List[OpportunityDigestResponse]
    total: int
    page: int
    size: int
    total_pages: int
    has_next: bool


class OpportunityDigestFilter(BaseModel):
    type: Optional[str] = Query(default=None, description="Filter by opportunity type")
    majors: Optional[str] = Query(default=None, description="Filter by majors substring")
    eligibility: Optional[str] = Query(default=None, description="Filter by eligibility")
    q: Optional[str] = Query(default=None, description="Search in name/description")
    hide_expired: bool = Query(default=False, description="Hide expired opportunities")
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)")
    size: int = Query(default=15, ge=1, le=1000, description="Page size")
