from datetime import date, datetime
from typing import List

from fastapi import Query
from pydantic import BaseModel, field_validator, model_validator

from backend.core.database.models import EducationLevel, OpportunityType


class OpportunityEligibility(BaseModel):
    id: str | None = None
    education_level: EducationLevel
    min_year: int | None = None
    max_year: int | None = None

    @model_validator(mode="after")
    def validate_year_range(self):
        if self.education_level == EducationLevel.UG:
            if self.min_year is None or self.max_year is None:
                raise ValueError("UG eligibility requires min_year and max_year")
            if not (1 <= self.min_year <= 4 and 1 <= self.max_year <= 4):
                raise ValueError("UG years must be between 1 and 4")
            if self.min_year > self.max_year:
                raise ValueError("UG min_year cannot exceed max_year")
        elif self.education_level == EducationLevel.GRM:
            if self.min_year is None or self.max_year is None:
                raise ValueError("GrM eligibility requires min_year and max_year")
            if not (1 <= self.min_year <= 2 and 1 <= self.max_year <= 2):
                raise ValueError("GrM years must be between 1 and 2")
            if self.min_year > self.max_year:
                raise ValueError("GrM min_year cannot exceed max_year")
        elif self.education_level == EducationLevel.PHD:
            if self.min_year is not None or self.max_year is not None:
                raise ValueError("PhD eligibility should not set year bounds")
        return self

    class Config:
        from_attributes = True


class OpportunityBase(BaseModel):
    name: str
    description: str | None = None
    deadline: date | None = None
    steps: str | None = None
    host: str | None = None
    type: OpportunityType
    majors: str | None = None
    link: str | None = None
    location: str | None = None
    funding: str | None = None
    created_at: datetime
    updated_at: datetime
    eligibility: List[OpportunityEligibility] = []

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
    type: OpportunityType | None = None
    majors: str | None = None
    link: str | None = None
    location: str | None = None
    funding: str | None = None
    eligibility: List[OpportunityEligibility] | None = None

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
    type: OpportunityType | None = Query(default=None, description="Filter by opportunity type")
    majors: str | None = Query(default=None, description="Filter by majors substring")
    education_level: EducationLevel | None = Query(default=None, description="Filter by education level")
    min_year: int | None = Query(default=None, description="Minimum study year for eligibility")
    max_year: int | None = Query(default=None, description="Maximum study year for eligibility")
    q: str | None = Query(default=None, description="Search in name/description")
    hide_expired: bool = Query(default=False, description="Hide expired opportunities")
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)")
    size: int = Query(default=15, ge=1, le=1000, description="Page size")
