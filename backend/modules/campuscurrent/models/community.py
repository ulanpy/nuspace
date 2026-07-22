from datetime import date, datetime
from backend.common.datetime_utils import utc_now
from enum import Enum as PyEnum

from sqlalchemy import BigInteger, Column, Date, DateTime, ForeignKey
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.database.models.base import Base


class CommunityCategory(PyEnum):
    academic = "academic"
    professional = "professional"
    recreational = "recreational"
    cultural = "cultural"
    sports = "sports"
    social = "social"
    art = "art"


class CommunityType(PyEnum):
    club = "club"
    university = "university"
    organization = "organization"


class Community(Base):
    __tablename__ = "communities"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False)
    name: Mapped[str] = mapped_column(nullable=False, unique=False, index=True)
    type: Mapped[CommunityType] = mapped_column(
        SQLEnum(CommunityType, name="community_type"), nullable=False, index=True
    )
    category: Mapped[CommunityCategory] = mapped_column(
        SQLEnum(CommunityCategory, name="community_category"), nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(nullable=True, unique=False)
    verified: Mapped[bool] = mapped_column(nullable=False, default=False, index=True)
    description: Mapped[str] = mapped_column(nullable=False)
    established: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    head: Mapped[str] = mapped_column(
        ForeignKey("users.sub", ondelete="SET NULL"), nullable=True, index=True
    )
    telegram_url: Mapped[str] = mapped_column(nullable=True, unique=False)
    instagram_url: Mapped[str] = mapped_column(nullable=True, unique=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    head_user = relationship("User")
