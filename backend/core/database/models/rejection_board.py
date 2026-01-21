from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, Enum as SAEnum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.core.database.models.base import Base

class RejectionOpportunityType(str, Enum):
    RESEARCH = "research"
    INTERNSHIP = "internship"
    SCHOLARSHIP = "scholarship"
    JOB = "job"
    GRAD_SCHOOL = "grad_school"
    OTHER = "other"

class IsAccepted(str, Enum):
    YES = "YES"
    NO = "NO"

class StillTrying(str, Enum):
    YES = "YES"
    NO = "NO"

class RejectionBoard(Base):
    __tablename__ = "rejection_board"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    reflection: Mapped[str] = mapped_column(Text, nullable=False)
    rejection_opportunity_type: Mapped[RejectionOpportunityType] = mapped_column(
        SAEnum(RejectionOpportunityType, name="rejection_opportunity_type"), nullable=False
    )
    is_accepted: Mapped[IsAccepted] = mapped_column(
        SAEnum(IsAccepted, name="is_accepted"), nullable=False
    )
    still_trying: Mapped[StillTrying] = mapped_column(
        SAEnum(StillTrying, name="still_trying"), nullable=False
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
