from datetime import date, datetime 
from enum import Enum

from sqlalchemy import Column, Date, DateTime, Enum as SAEnum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.database.models.base import Base

class RejectionOpportunityType(str, Enum):
    RESEARCH = "research"
    INTERNSHIP = "internship"
    SCHOLARSHIP = "scholarship"
    JOB = "job"
    GRAD_SCHOOL = "grad_school"
    OTHER = "other"

class is_accepted(Enum):
    YES = True
    NO = False

class still_trying(Enum):
    YES = True
    NO = False

class RejectionBoard(Base):
    __tablename__ = "rejection_board"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nickname: Mapped[str] = mapped_column(String(128), nullable=False)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    reflection: Mapped[str] = mapped_column(Text, nullable=False)
    rejection_opportunity_type: Mapped[RejectionOpportunityType] = mapped_column(
        SAEnum(RejectionOpportunityType, name="rejection_opportunity_type"), nullable=False
    )
    is_accepted: Mapped[is_accepted] = mapped_column(SAEnum(is_accepted, name="is_accepted"), nullable=False)
    still_trying: Mapped[still_trying] = mapped_column(SAEnum(still_trying, name="still_trying"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
