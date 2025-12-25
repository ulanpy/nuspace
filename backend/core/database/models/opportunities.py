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


class OpportunityMajor(str, Enum):
    ENGINEERING_MANAGEMENT = "Engineering Management"
    MECHANICAL_AND_AEROSPACE_ENGINEERING = "Mechanical and Aerospace Engineering"
    ELECTRICAL_AND_COMPUTER_ENGINEERING = "Electrical and Computer Engineering"
    CHEMICAL_AND_MATERIALS_ENGINEERING = "Chemical and Materials Engineering"
    CIVIL_AND_ENVIRONMENTAL_ENGINEERING = "Civil and Environmental Engineering"
    BIOMEDICAL_ENGINEERING = "Biomedical Engineering"
    MINING_ENGINEERING = "Mining Engineering"
    PETROLEUM_ENGINEERING = "Petroleum Engineering"
    ROBOTICS_AND_MECHATRONICS_ENGINEERING = "Robotics and Mechatronics Engineering"
    COMPUTER_SCIENCE = "Computer Science"
    DATA_SCIENCE = "Data Science"
    APPLIED_MATHEMATICS = "Applied Mathematics"
    MATHEMATICS = "Mathematics"
    ECONOMICS = "Economics"
    BUSINESS_ADMINISTRATION = "Business Administration"
    FINANCE = "Finance"
    LIFE_SCIENCES = "Life Sciences"
    BIOLOGICAL_SCIENCES = "Biological Sciences"
    MEDICAL_SCIENCES = "Medical Sciences"
    MOLECULAR_MEDICINE = "Molecular Medicine"
    PHARMACOLOGY_AND_TOXICOLOGY = "Pharmacology and Toxicology"
    PUBLIC_HEALTH = "Public Health"
    SPORTS_MEDICINE_AND_REHABILITATION = "Sports Medicine and Rehabilitation"
    NURSING = "Nursing"
    DOCTOR_OF_MEDICINE = "Doctor of Medicine"
    SIX_YEAR_MEDICAL_PROGRAM = "A Six-Year Medical Program"
    CHEMISTRY = "Chemistry"
    PHYSICS = "Physics"
    GEOSCIENCES = "Geosciences"
    GEOLOGY = "Geology"
    POLITICAL_SCIENCE_AND_INTERNATIONAL_RELATIONS = "Political Science and International Relations"
    PUBLIC_POLICY = "Public Policy"
    PUBLIC_ADMINISTRATION = "Public Administration"
    EURASIAN_STUDIES = "Eurasian Studies"
    SOCIOLOGY = "Sociology"
    ANTHROPOLOGY = "Anthropology"
    HISTORY = "History"
    EDUCATIONAL_LEADERSHIP = "Educational Leadership"
    MULTILINGUAL_EDUCATION = "Multilingual Education"
    WORLD_LANGUAGES_LITERATURE_AND_CULTURE = "World Languages, Literature and Culture"


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
    majors: Mapped[list["OpportunityMajorMap"]] = relationship(
        "OpportunityMajorMap",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class OpportunityMajorMap(Base):
    __tablename__ = "opportunity_majors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    opportunity_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("opportunities.id", ondelete="CASCADE"), nullable=False
    )
    major: Mapped[OpportunityMajor] = mapped_column(
        SAEnum(OpportunityMajor, name="opportunity_major"),
        nullable=False,
    )