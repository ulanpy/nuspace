from datetime import date, datetime
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
    nickname: str
    title: str
    reflection: str
    rejection_opportunity_type: RejectionOpportunityType
    is_accepted: is_accepted
    still_trying: still_trying

class RejectionBoardUpdateDTO(BaseModel):
    nickname: str | None = None
    title: str | None = None
    reflection: str | None = None
    rejection_opportunity_type: RejectionOpportunityType | None = None
    is_accepted: is_accepted | None = None
    still_trying: still_trying | None = None

class RejectionBoardResponseDTO(BaseModel):
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
