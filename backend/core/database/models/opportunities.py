from datetime import date, datetime
from enum import Enum

from sqlalchemy import Column, Date, DateTime, Enum as SAEnum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

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


class EducationLevel(str, Enum):
    UG = "UG"
    GRM = "GrM"
    PHD = "PhD"


class OpportunityEligibility(Base):
    __tablename__ = "opportunity_eligibility"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    opportunity_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("opportunities.id", ondelete="CASCADE"), nullable=False
    )
    education_level: Mapped[EducationLevel] = mapped_column(
        SAEnum(EducationLevel, name="education_level"),
        nullable=False,
    )
    min_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_year: Mapped[int | None] = mapped_column(Integer, nullable=True)


class Opportunity(Base):
    __tablename__ = "opportunities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    host: Mapped[str | None] = mapped_column(String(256), nullable=True)
    type: Mapped[OpportunityType] = mapped_column(
        SAEnum(OpportunityType, name="opportunity_type"),
        nullable=False,
    )
    majors: Mapped[str | None] = mapped_column(String(512), nullable=True)
    link: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    location: Mapped[str | None] = mapped_column(String(256), nullable=True)
    funding: Mapped[str | None] = mapped_column(String(256), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    eligibilities: Mapped[list[OpportunityEligibility]] = relationship(
        "OpportunityEligibility",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )