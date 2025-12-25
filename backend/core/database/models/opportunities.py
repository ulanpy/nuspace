from datetime import date, datetime
from enum import Enum

from sqlalchemy import Column, Date, DateTime, Enum as SAEnum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.core.database.models.base import Base


class OpportunityType(str, Enum):
    RESEARCH = "research"
    INTERNSHIP = "internship"
    SUMMER_SCHOOL = "summer_school"
    FORUM = "forum"
    SUMMIT = "summit"
    GRANT = "grant"
    SCHOLARSHIP = "scholarship"
    CONFERENCE = "conference"


class Opportunity(Base):
    __tablename__ = "opportunities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    steps: Mapped[str | None] = mapped_column(Text, nullable=True)
    host: Mapped[str | None] = mapped_column(String(256), nullable=True)
    type: Mapped[OpportunityType] = mapped_column(
        SAEnum(OpportunityType, name="opportunity_type"),
        nullable=False,
    )
    majors: Mapped[str | None] = mapped_column(String(512), nullable=True)
    link: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    location: Mapped[str | None] = mapped_column(String(256), nullable=True)
    eligibility: Mapped[str | None] = mapped_column(Text, nullable=True)
    funding: Mapped[str | None] = mapped_column(String(256), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)