from datetime import date, datetime
from enum import Enum as PyEnum

from sqlalchemy import BigInteger, Column, Date, DateTime, ForeignKey
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


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


class CommunityRecruitmentStatus(PyEnum):
    open = "open"
    closed = "closed"
    upcoming = "upcoming"


class Community(Base):
    __tablename__ = "communities"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(nullable=False, unique=False)
    type: Mapped[CommunityType] = mapped_column(
        SQLEnum(CommunityType, name="community_type"), nullable=False
    )
    category: Mapped[CommunityCategory] = mapped_column(
        SQLEnum(CommunityCategory, name="community_category"), nullable=False
    )
    email: Mapped[str] = mapped_column(nullable=True, unique=False)
    recruitment_status: Mapped[CommunityRecruitmentStatus] = mapped_column(
        SQLEnum(CommunityRecruitmentStatus, name="community_recruitment_status"),
        nullable=False,
        default=CommunityRecruitmentStatus.closed,
    )
    verified: Mapped[bool] = mapped_column(nullable=False, default=False)
    recruitment_link: Mapped[str] = mapped_column(nullable=True, unique=False)
    description: Mapped[str] = mapped_column(nullable=False)
    established: Mapped[date] = mapped_column(Date, nullable=False)
    head: Mapped[str] = mapped_column(ForeignKey("users.sub", ondelete="SET NULL"), nullable=True)
    telegram_url: Mapped[str] = mapped_column(nullable=True, unique=False)
    instagram_url: Mapped[str] = mapped_column(nullable=True, unique=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    head_user = relationship("User", back_populates="communities_led")
    tags = relationship(
        "CommunityPostTag", back_populates="community", cascade="all, delete-orphan"
    )
    events = relationship("Event", back_populates="community", cascade="all, delete-orphan")


class CommunityPostTag(Base):
    __tablename__ = "community_post_tags"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    community_id: Mapped[int] = mapped_column(
        ForeignKey("communities.id", ondelete="CASCADE"), nullable=False, unique=False
    )
    name: Mapped[str] = mapped_column(nullable=False, unique=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    community = relationship("Community", back_populates="tags")


class CommunityPost(Base):
    __tablename__ = "community_posts"
    id: Mapped[BigInteger] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    community_id: Mapped[int] = mapped_column(
        ForeignKey("communities.id", ondelete="CASCADE"), nullable=False, unique=False
    )
    user_sub: Mapped[str] = mapped_column(
        ForeignKey("users.sub", ondelete="SET NULL"), nullable=True, unique=False
    )
    title: Mapped[str] = mapped_column(nullable=False, unique=False)
    description: Mapped[str] = mapped_column(nullable=False, unique=False)
    tag_id: Mapped[int] = mapped_column(
        ForeignKey("community_post_tags.id", ondelete="SET NULL"), nullable=True, unique=False
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    from_community: Mapped[bool] = mapped_column(nullable=False, default=False)

    user = relationship("User", back_populates="posts")
    community = relationship("Community")
    tag = relationship("CommunityPostTag")


class CommunityMember(Base):
    __tablename__ = "community_members"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    community_id: Mapped[int] = mapped_column(
        ForeignKey("communities.id", ondelete="CASCADE"), nullable=False, unique=False
    )
    user_sub: Mapped[str] = mapped_column(
        ForeignKey("users.sub", ondelete="SET NULL"), nullable=True, unique=False
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    community = relationship("Community")
    user = relationship("User", back_populates="communities")


class CommunityComment(Base):
    __tablename__ = "community_comments"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    post_id: Mapped[int] = mapped_column(
        ForeignKey("community_posts.id", ondelete="CASCADE"), nullable=False, unique=False
    )
    parent_id: Mapped[int] = mapped_column(
        ForeignKey("community_comments.id", ondelete="CASCADE"), nullable=True, unique=False
    )
    user_sub: Mapped[str] = mapped_column(
        ForeignKey("users.sub", ondelete="SET NULL"), nullable=True, unique=False
    )
    content: Mapped[str] = mapped_column(nullable=False, unique=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    deleted_at: Mapped[DateTime] = mapped_column(DateTime, nullable=True)

    user = relationship("User")
