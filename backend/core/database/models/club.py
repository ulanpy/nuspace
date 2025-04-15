from enum import unique
from sqlalchemy import Column, Integer, String
from .base import Base
from sqlalchemy.orm import DeclarativeBase
from typing import List
from typing import Optional
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, BigInteger
from datetime import datetime, UTC
from sqlalchemy.dialects.postgresql import UUID
import uuid
from enum import Enum
from sqlalchemy import Integer, Enum as SQLEnum
from backend.core.database.models.user import UserRole
from sqlalchemy import Date


class EventPolicy(Enum):
    open = "open"
    free_ticket = "free_ticket"
    paid_ticket = "paid_ticket"

class ClubType(Enum):
    academic = "academic"
    professional = "professional"
    recreational = "recreational"
    cultural = "cultural"
    sports = "sports"
    social = "social"
    art = "art"



class Club(Base):
    __tablename__ = 'clubs'
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(nullable=False, unique=True)
    type: Mapped[ClubType] = mapped_column(SQLEnum(ClubType, name="club_type"), nullable=False)
    description: Mapped[str] = mapped_column(nullable=False)
    president: Mapped[str] = mapped_column(ForeignKey('users.sub'), nullable=False)
    telegram_url: Mapped[str] = mapped_column(nullable=True, unique=False)
    instagram_url: Mapped[str] = mapped_column(nullable=True, unique=False)
    picture: Mapped[str] = mapped_column(nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    managers = relationship("ClubManager", back_populates="club")
    events = relationship('ClubEvent', back_populates='club')
    announcements = relationship('ClubAnnouncement', back_populates='club')
    president_user = relationship("User", back_populates="clubs_led")

class ClubManager(Base):
    __tablename__ = 'club_managers'
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    club_id: Mapped[str] = mapped_column(ForeignKey('clubs.id'), nullable=False, unique=False)
    sub: Mapped[str] = mapped_column(ForeignKey('users.sub'), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    club = relationship("Club", back_populates="managers")


class ClubEvent(Base):
    __tablename__ = 'club_events'
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    club_id: Mapped[str] = mapped_column(ForeignKey('clubs.id'), nullable=False, unique=False)
    picture: Mapped[str] = mapped_column(nullable=False)
    policy: Mapped[EventPolicy] = mapped_column(SQLEnum(EventPolicy, name="event_policy"), nullable=False)
    name: Mapped[str] = mapped_column(nullable=False, unique=False)
    place: Mapped[str] = mapped_column(nullable=False, unique=False)
    event_datetime: Mapped[DateTime] = mapped_column(DateTime, nullable=False)  # DateTime column
    description: Mapped[str] = mapped_column(nullable=False, unique=False)
    duration: Mapped[int] = mapped_column(nullable=True, unique=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    club = relationship("Club", back_populates="events")





class ClubAnnouncement(Base):
    __tablename__ = "club_announcements"
    id: Mapped[BigInteger] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    club_id: Mapped[str] = mapped_column(ForeignKey('clubs.id'), nullable=False, unique=False)
    banner: Mapped[str] = mapped_column(nullable=False, unique=True)
    description: Mapped[str] = mapped_column(nullable=False, unique=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    club = relationship("Club", back_populates="announcements")
