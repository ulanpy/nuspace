from datetime import date
from typing import Optional, List

from pydantic import BaseModel, HttpUrl, field_validator
from pydantic import Field
from fastapi import Query


class OpportunityDigestBase(BaseModel):
    opp_name: str = Field(..., max_length=512)
    opp_description: Optional[str] = None
    opp_deadline: Optional[date] = None
    opp_steps: Optional[str] = None
    opp_host: Optional[str] = Field(default=None, max_length=256)
    opp_type: Optional[str] = Field(default=None, max_length=128)
    opp_majors: Optional[str] = Field(default=None, max_length=512)
    opp_link: Optional[str] = None
    opp_location: Optional[str] = Field(default=None, max_length=256)
    opp_eligibility: Optional[str] = None
    opp_funding: Optional[str] = Field(default=None, max_length=256)

    class Config:
        from_attributes = True

    @field_validator("opp_link")
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
    @field_validator("opp_deadline")
    def validate_deadline(cls, v):
        if v is not None and v < date.today():
            raise ValueError("Deadline cannot be in the past")
        return v


class OpportunityDigestUpdate(BaseModel):
    opp_name: Optional[str] = Field(default=None, max_length=512)
    opp_description: Optional[str] = None
    opp_deadline: Optional[date] = None
    opp_steps: Optional[str] = None
    opp_host: Optional[str] = Field(default=None, max_length=256)
    opp_type: Optional[str] = Field(default=None, max_length=128)
    opp_majors: Optional[str] = Field(default=None, max_length=512)
    opp_link: Optional[str] = None
    opp_location: Optional[str] = Field(default=None, max_length=256)
    opp_eligibility: Optional[str] = None
    opp_funding: Optional[str] = Field(default=None, max_length=256)

    class Config:
        from_attributes = True


class OpportunityDigestResponse(OpportunityDigestBase):
    opp_id: int


class OpportunityDigestListResponse(BaseModel):
    items: List[OpportunityDigestResponse]
    total: int
    page: int
    size: int
    total_pages: int
    has_next: bool


class OpportunityDigestFilter(BaseModel):
    opp_type: Optional[str] = Query(default=None, description="Filter by opportunity type")
    opp_majors: Optional[str] = Query(default=None, description="Filter by majors substring")
    opp_eligibility: Optional[str] = Query(default=None, description="Filter by eligibility")
    q: Optional[str] = Query(default=None, description="Search in name/description")
    hide_expired: bool = Query(default=False, description="Hide expired opportunities")
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)")
    size: int = Query(default=15, ge=1, le=1000, description="Page size")
