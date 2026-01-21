from datetime import datetime
from typing import List

from pydantic import BaseModel, Field

from backend.core.database.models import RejectionOpportunityType, IsAccepted, StillTrying


class RejectionBoardBase(BaseModel):
    id: int
    title: str
    reflection: str
    rejection_opportunity_type: RejectionOpportunityType
    is_accepted: IsAccepted
    still_trying: StillTrying
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        extra = "ignore"


class RejectionBoardCreateDTO(BaseModel):
    title: str = Field(max_length=120)
    reflection: str = Field(max_length=800)
    rejection_opportunity_type: RejectionOpportunityType
    is_accepted: IsAccepted
    still_trying: StillTrying


class RejectionBoardUpdateDTO(BaseModel):
    title: str | None = Field(default=None, max_length=120)
    reflection: str | None = Field(default=None, max_length=800)
    rejection_opportunity_type: RejectionOpportunityType | None = None
    is_accepted: IsAccepted | None = None
    still_trying: StillTrying | None = None


class RejectionBoardResponseDTO(RejectionBoardBase):
    pass


class RejectionBoardListResponse(BaseModel):
    items: List[RejectionBoardResponseDTO]
    total: int
    page: int
    size: int
    total_pages: int
    has_next: bool


class RejectionBoardFilter(BaseModel):
    rejection_opportunity_type: RejectionOpportunityType | None = Field(
        default=None, description="Filter by opportunity type"
    )
    is_accepted: IsAccepted | None = Field(default=None, description="Filter by outcome")
    still_trying: StillTrying | None = Field(default=None, description="Filter by still trying flag")
    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    size: int = Field(default=15, ge=1, le=100, description="Page size")
