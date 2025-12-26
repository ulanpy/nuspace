from datetime import date, datetime
from typing import List

from fastapi import Query
from pydantic import BaseModel, field_validator, model_validator, Field

from backend.core.database.models import EducationLevel, OpportunityType, OpportunityMajor


class OpportunityEligibility(BaseModel):
    id: str | None = None
    education_level: EducationLevel
    year: int | None

    @model_validator(mode="after")
    def validate_year(self):
        if self.education_level == EducationLevel.UG:
            if self.year is None:
                raise ValueError("UG eligibility requires year")
            if not (1 <= self.year <= 4):
                raise ValueError("UG year must be between 1 and 4")
        elif self.education_level == EducationLevel.GRM:
            if self.year is None:
                raise ValueError("GrM eligibility requires year")
            if not (1 <= self.year <= 2):
                raise ValueError("GrM year must be between 1 and 2")
        elif self.education_level == EducationLevel.PHD:
            # For PhD, year must be None
            if self.year is not None:
                raise ValueError("PhD eligibility should not set year")
        return self

    class Config:
        from_attributes = True


class OpportunityBase(BaseModel):
    name: str
    description: str | None = None
    deadline: date | None = None
    host: str | None = None
    type: OpportunityType
    majors: List[OpportunityMajor] = []
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
    host: str | None = None
    type: OpportunityType | None = None
    majors: List[OpportunityMajor] | None = None
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
    type: List[OpportunityType] | None = Field(default=None, description="Filter by opportunity types")
    majors: List[OpportunityMajor] | None = Field(default=None, description="Filter by majors")
    education_level: List[EducationLevel] | None = Field(default=None, description="Filter by education levels")
    years: List[int] | None = Field(default=None, description="Study years to match (for UG/GrM)")
    q: str | None = Field(default=None, description="Search in name/description")
    hide_expired: bool = Field(default=False, description="Hide expired opportunities")
    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    size: int = Field(default=15, ge=1, le=1000, description="Page size")
