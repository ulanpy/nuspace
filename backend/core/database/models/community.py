from datetime import date, datetime
from enum import Enum as PyEnum

from sqlalchemy import BigInteger, Column, Date, DateTime, ForeignKey
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class RegistrationPolicy(PyEnum):
    registration = "registration"
    open = "open"


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


class EventTag(PyEnum):
    featured = "featured"
    promotional = "promotional"
    regular = "regular"
    charity = "charity"


class EventStatus(PyEnum):
    pending = "pending"  # Awaiting approval (for club events)
    approved = "approved"  # Approved and visible
    rejected = "rejected"  # Rejected by head
    personal = "personal"  # Created by user for themselves (not club event)
    cancelled = "cancelled"  # Cancelled after approval


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
    recruitment_status: Mapped[CommunityRecruitmentStatus] = mapped_column(
        SQLEnum(CommunityRecruitmentStatus, name="community_recruitment_status"),
        nullable=False,
        default=CommunityRecruitmentStatus.closed,
    )
    description: Mapped[str] = mapped_column(nullable=False)
    established: Mapped[date] = mapped_column(Date, nullable=False)
    head: Mapped[str] = mapped_column(ForeignKey("users.sub"), nullable=False)
    telegram_url: Mapped[str] = mapped_column(nullable=True, unique=False)
    instagram_url: Mapped[str] = mapped_column(nullable=True, unique=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    head_user = relationship("User", back_populates="communities_led")
    tags = relationship("CommunityTag", back_populates="community", cascade="all, delete-orphan")
    events = relationship(
        "CommunityEvent", back_populates="community", cascade="all, delete-orphan"
    )


class CommunityEvent(Base):
    __tablename__ = "community_events"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    community_id: Mapped[str] = mapped_column(
        ForeignKey("communities.id"), nullable=True, unique=False
    )
    creator_sub: Mapped[str] = mapped_column(ForeignKey("users.sub"), nullable=False)
    policy: Mapped[RegistrationPolicy] = mapped_column(
        SQLEnum(RegistrationPolicy, name="event_policy"), nullable=False
    )
    name: Mapped[str] = mapped_column(nullable=False, unique=False)
    place: Mapped[str] = mapped_column(nullable=False, unique=False)
    event_datetime: Mapped[DateTime] = mapped_column(DateTime, nullable=False)  # DateTime column
    description: Mapped[str] = mapped_column(nullable=False, unique=False)
    duration: Mapped[int] = mapped_column(nullable=True, unique=False)

    status: Mapped[EventStatus] = mapped_column(
        SQLEnum(EventStatus, name="event_status"), nullable=False, default=EventStatus.personal
    )
    tag: Mapped[EventTag] = mapped_column(
        SQLEnum(EventTag, name="event_tag"), nullable=False, default=EventTag.regular
    )  # only admins can edit tag

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    creator = relationship("User", back_populates="events")
    community = relationship("Community", back_populates="events")


class CommunityTag(Base):
    __tablename__ = "community_post_tags"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    community_id: Mapped[str] = mapped_column(
        ForeignKey("communities.id"), nullable=False, unique=False
    )
    name: Mapped[str] = mapped_column(nullable=False, unique=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    community = relationship("Community", back_populates="tags")


class CommunityPost(Base):
    __tablename__ = "community_posts"
    id: Mapped[BigInteger] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    community_id: Mapped[str] = mapped_column(
        ForeignKey("communities.id"), nullable=False, unique=False
    )
    user_sub: Mapped[str] = mapped_column(ForeignKey("users.sub"), nullable=False)
    title: Mapped[str] = mapped_column(nullable=False, unique=False)
    description: Mapped[str] = mapped_column(nullable=False, unique=False)
    tag: Mapped[CommunityTag] = mapped_column(
        ForeignKey("community_post_tags.id"), nullable=False, unique=False
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    from_community: Mapped[bool] = mapped_column(nullable=False, default=False)

    user = relationship("User", back_populates="posts")
    community = relationship("Community")


class CommunityMember(Base):
    __tablename__ = "community_members"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    community_id: Mapped[str] = mapped_column(
        ForeignKey("communities.id"), nullable=False, unique=False
    )
    user_sub: Mapped[str] = mapped_column(ForeignKey("users.sub"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    community = relationship("Community")
    user = relationship("User", back_populates="communities")


class CommunityComment(Base):
    __tablename__ = "community_comments"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    post_id: Mapped[int] = mapped_column(
        ForeignKey("community_posts.id"), nullable=False, unique=False
    )
    parent_id: Mapped[int] = mapped_column(
        ForeignKey("community_comments.id"), nullable=True, unique=False
    )
    user_sub: Mapped[str] = mapped_column(ForeignKey("users.sub"), nullable=False)
    content: Mapped[str] = mapped_column(nullable=False, unique=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
