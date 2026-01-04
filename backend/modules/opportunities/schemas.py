from datetime import date, datetime
from typing import List

from pydantic import BaseModel, Field

from backend.core.database.models import EducationLevel, OpportunityType, OpportunityMajor


class OpportunityEligibilityBase(BaseModel):
    """orm to pydantic mapping. do not use in create/update requests"""
    id: int
    education_level: EducationLevel
    year: int | None

    class Config:
        from_attributes = True

class OpportunityMajorMapBase(BaseModel):
    """orm to pydantic mapping. do not use in create/update requests"""
    id: int
    opportunity_id: int
    major: OpportunityMajor

    class Config:
        from_attributes = True

class OpportunityBase(BaseModel):
    """orm to pydantic mapping. do not use in create/update requests"""
    id: int
    name: str
    description: str | None = None
    deadline: date | None = None
    host: str | None = None
    type: OpportunityType
    majors: List[OpportunityMajorMapBase] = []
    link: str | None = None
    location: str | None = None
    funding: str | None = None
    eligibilities: List[OpportunityEligibilityBase] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        extra = "ignore"

class OpportunityEligibilityCreateDto(BaseModel):
    education_level: EducationLevel
    year: int | None


class OpportunityEligibilityUpdateDto(BaseModel):
    """update request of eligibility perform full replacement"""
    education_level: EducationLevel | None = None
    year: int | None = None

class OpportunityCreateDto(BaseModel):
    name: str
    description: str | None = None
    deadline: date | None = None
    host: str | None = None
    type: OpportunityType
    majors: List[OpportunityMajor] = []
    link: str | None = None
    location: str | None = None
    funding: str | None = None
    eligibilities: List[OpportunityEligibilityCreateDto] = []


class OpportunityUpdateDto(BaseModel):
    name: str | None = None
    description: str | None = None
    deadline: date | None = None
    host: str | None = None
    type: OpportunityType | None = None
    majors: List[OpportunityMajor] | None = None
    link: str | None = None
    location: str | None = None
    funding: str | None = None
    eligibilities: List[OpportunityEligibilityUpdateDto] | None = None

class OpportunityResponseDto(OpportunityBase):
    pass

class OpportunityListResponse(BaseModel):
    items: List[OpportunityResponseDto]
    total: int
    page: int
    size: int
    total_pages: int
    has_next: bool


class OpportunityFilter(BaseModel):
    type: List[OpportunityType] | None = Field(default=None, description="Filter by opportunity types")
    majors: List[OpportunityMajor] | None = Field(default=None, description="Filter by majors")
    education_level: List[EducationLevel] | None = Field(default=None, description="Filter by education levels")
    years: List[int] | None = Field(default=None, description="Study years to match (for UG/GrM)")
    q: str | None = Field(default=None, description="Search in name/description")
    hide_expired: bool = Field(default=False, description="Hide expired opportunities")
    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    size: int = Field(default=15, ge=1, le=1000, description="Page size")


class OpportunityCalendarResponse(BaseModel):
    created: int
    google_errors: List[str] = []
