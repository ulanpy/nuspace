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
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False)
    name: Mapped[str] = mapped_column(nullable=False, unique=False, index=True)
    type: Mapped[CommunityType] = mapped_column(
        SQLEnum(CommunityType, name="community_type"), nullable=False, index=True
    )
    category: Mapped[CommunityCategory] = mapped_column(
        SQLEnum(CommunityCategory, name="community_category"), nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(nullable=True, unique=False)
    recruitment_status: Mapped[CommunityRecruitmentStatus] = mapped_column(
        SQLEnum(CommunityRecruitmentStatus, name="community_recruitment_status"),
        nullable=False,
        default=CommunityRecruitmentStatus.closed,
        index=True,
    )
    verified: Mapped[bool] = mapped_column(nullable=False, default=False, index=True)
    recruitment_link: Mapped[str] = mapped_column(nullable=True, unique=False)
    description: Mapped[str] = mapped_column(nullable=False)
    established: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    head: Mapped[str] = mapped_column(
        ForeignKey("users.sub", ondelete="SET NULL"), nullable=True, index=True
    )
    telegram_url: Mapped[str] = mapped_column(nullable=True, unique=False)
    instagram_url: Mapped[str] = mapped_column(nullable=True, unique=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    head_user = relationship("User", back_populates="communities_led")
    events = relationship("Event", back_populates="community", cascade="all, delete-orphan")
    achievements = relationship(
        "CommunityAchievements",
        back_populates="community",
        cascade="all, delete-orphan",
    )
    photo_albums = relationship(
        "CommunityPhotoAlbum",
        back_populates="community",
        cascade="all, delete-orphan",
    )


class CommunityMember(Base):
    __tablename__ = "community_members"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False)
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
    
    
class CommunityAchievements(Base):
    __tablename__ = "community_achievements"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False)
    community_id: Mapped[int] = mapped_column(
        ForeignKey("communities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    description: Mapped[str] = mapped_column(nullable=False)
    year: Mapped[int] = mapped_column(nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    community = relationship("Community", back_populates="achievements")


class CommunityPhotoAlbumType(PyEnum):
    event_photos = "event_photos"
    club_photoshoot = "club_photoshoot"
    other = "other"


class CommunityPhotoAlbum(Base):
    __tablename__ = "community_photo_albums"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False)
    community_id: Mapped[int] = mapped_column(
        ForeignKey("communities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    album_url: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[str] = mapped_column(nullable=True)
    album_type: Mapped[CommunityPhotoAlbumType] = mapped_column(
        SQLEnum(CommunityPhotoAlbumType, name="community_photo_album_type"),
        nullable=False,
        default=CommunityPhotoAlbumType.other,
        index=True,
    )
    # Metadata fetched from Google Photos
    album_title: Mapped[str] = mapped_column(nullable=True)
    album_thumbnail_url: Mapped[str] = mapped_column(nullable=True)
    album_date: Mapped[date] = mapped_column(Date, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    community = relationship("Community", back_populates="photo_albums")