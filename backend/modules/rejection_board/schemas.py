from datetime import datetime
from typing import List

from pydantic import BaseModel, Field

from backend.core.database.models import RejectionOpportunityType, is_accepted, still_trying


class RejectionBoardBase(BaseModel):
    id: int
    nickname: str
    title: str
    reflection: str
    rejection_opportunity_type: RejectionOpportunityType
    is_accepted: is_accepted
    still_trying: still_trying
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        extra = "ignore"


class RejectionBoardCreateDTO(BaseModel):
    title: str
    reflection: str
    rejection_opportunity_type: RejectionOpportunityType
    is_accepted: is_accepted
    still_trying: still_trying


class RejectionBoardUpdateDTO(BaseModel):
    title: str | None = None
    reflection: str | None = None
    rejection_opportunity_type: RejectionOpportunityType | None = None
    is_accepted: is_accepted | None = None
    still_trying: still_trying | None = None


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
    nickname: str | None = Field(default=None, description="Filter by nickname")
    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    size: int = Field(default=15, ge=1, le=100, description="Page size")
