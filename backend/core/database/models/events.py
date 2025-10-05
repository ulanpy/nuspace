from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class RegistrationPolicy(PyEnum):
    registration = "registration"
    open = "open"


class EventTag(PyEnum):
    featured = "featured"
    promotional = "promotional"
    regular = "regular"
    charity = "charity"


class EventStatus(PyEnum):
    pending = "pending"  # Awaiting approval (for club events)
    approved = "approved"  # Approved and visible
    rejected = "rejected"  # Rejected by head
    cancelled = "cancelled"  # Cancelled after approval


class EventScope(PyEnum):
    personal = "personal"
    community = "community"


class EventType(PyEnum):
    academic = "academic"
    professional = "professional"
    recreational = "recreational"
    cultural = "cultural"
    sports = "sports"
    social = "social"
    art = "art"
    recruitment = "recruitment"


class CollaboratorType(PyEnum):
    user = "user"
    community = "community"


class EventCollaborator(Base):
    __tablename__ = "event_collaborators"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False)
    event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    collaborator_type: Mapped[CollaboratorType] = mapped_column(
        SQLEnum(CollaboratorType, name="collaborator_type"), nullable=False
    )
    user_sub: Mapped[str] = mapped_column(
        ForeignKey("users.sub", ondelete="CASCADE"), nullable=True, index=True
    )
    community_id: Mapped[int] = mapped_column(
        ForeignKey("communities.id", ondelete="CASCADE"), nullable=True, index=True
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    event = relationship("Event", back_populates="collaborators")
    user = relationship("User")
    community = relationship("Community")


class Event(Base):
    __tablename__ = "events"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False)
    community_id: Mapped[int] = mapped_column(
        ForeignKey("communities.id", ondelete="CASCADE"), nullable=True, unique=False, index=True
    )
    creator_sub: Mapped[str] = mapped_column(
        ForeignKey("users.sub", ondelete="SET NULL"), nullable=True, unique=False, index=True
    )
    policy: Mapped[RegistrationPolicy] = mapped_column(
        SQLEnum(RegistrationPolicy, name="event_policy"), nullable=False, index=True
    )
    registration_link: Mapped[str] = mapped_column(nullable=True, unique=False)
    name: Mapped[str] = mapped_column(nullable=False, unique=False)
    place: Mapped[str] = mapped_column(nullable=False, unique=False)
    start_datetime: Mapped[DateTime] = mapped_column(
        DateTime, nullable=False, index=True
    )  # Renamed from event_datetime
    end_datetime: Mapped[DateTime] = mapped_column(
        DateTime, nullable=False, index=True
    )  # New field
    description: Mapped[str] = mapped_column(nullable=False, unique=False)
    scope: Mapped[EventScope] = mapped_column(
        SQLEnum(EventScope, name="event_scope"), nullable=False, index=True
    )
    type: Mapped[EventType] = mapped_column(
        SQLEnum(EventType, name="event_type"), nullable=False, index=True
    )
    status: Mapped[EventStatus] = mapped_column(
        SQLEnum(EventStatus, name="event_status"), nullable=False, index=True
    )
    tag: Mapped[EventTag] = mapped_column(
        SQLEnum(EventTag, name="event_tag"), nullable=False, default=EventTag.regular
    )  # only admins can edit tag

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    creator = relationship("User", back_populates="events")
    community = relationship("Community", back_populates="events")
    collaborators = relationship(
        "EventCollaborator", back_populates="event", cascade="all, delete-orphan"
    )


# class EventAttendee(Base):
#     __tablename__ = "event_attendees"

#     id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False)
#     event_id: Mapped[int] = mapped_column(
#         ForeignKey("events.id", ondelete="CASCADE"), nullable=False
#     )
#     user_sub: Mapped[str] = mapped_column(
#         ForeignKey("users.sub", ondelete="CASCADE"), nullable=False
#     )
#     created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
#     updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow,
# nullable=False)
