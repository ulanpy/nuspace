from enum import Enum as PyEnum

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, PrimaryKeyConstraint, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.common.datetime_utils import utc_now
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
    owner: Mapped[str] = mapped_column(
        ForeignKey("users.sub", ondelete="SET NULL"), nullable=True, index=True
    )
    slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    page_content: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    owner_user = relationship("User")
    community_admins = relationship(
        "CommunityAdmin", back_populates="community", cascade="all, delete-orphan"
    )


class CommunityAdmin(Base):
    __tablename__ = "community_admins"
    __table_args__ = (PrimaryKeyConstraint("community_id", "user_sub"),)

    community_id: Mapped[int] = mapped_column(
        ForeignKey("communities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_sub: Mapped[str] = mapped_column(
        ForeignKey("users.sub", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    community = relationship("Community", back_populates="community_admins")
    user = relationship("User")


class CommunityAdminLink(Base):
    """Secret invite link that grants community-admin access on redemption."""

    __tablename__ = "community_admin_links"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False)
    community_id: Mapped[int] = mapped_column(
        ForeignKey("communities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    created_by_sub: Mapped[str] = mapped_column(
        ForeignKey("users.sub", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
