from datetime import datetime
from backend.common.datetime_utils import utc_now
from enum import Enum as PyEnum

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.database.models.base import Base


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


class EventBotSubmissionStatus(PyEnum):
    """Lifecycle of a Telegram → Event ingestion attempt."""

    pending_extract = "pending_extract"
    needs_info = "needs_info"
    preview = "preview"
    published = "published"
    rejected = "rejected"
    failed = "failed"


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
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    event = relationship("Event", back_populates="collaborators")
    user = relationship("User")
    community = relationship("Community")


class Event(Base):
    __tablename__ = "events"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False)
    creator_sub: Mapped[str] = mapped_column(
        ForeignKey("users.sub", ondelete="SET NULL"), nullable=True, unique=False, index=True
    )
    policy: Mapped[RegistrationPolicy] = mapped_column(
        SQLEnum(RegistrationPolicy, name="event_policy"), nullable=False, index=True
    )
    registration_link: Mapped[str] = mapped_column(nullable=True, unique=False)
    name: Mapped[str] = mapped_column(nullable=False, unique=False)
    place: Mapped[str] = mapped_column(nullable=False, unique=False)
    start_datetime: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )  # Renamed from event_datetime
    end_datetime: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )  # New field
    description: Mapped[str] = mapped_column(nullable=False, unique=False)
    type: Mapped[EventType] = mapped_column(
        SQLEnum(EventType, name="event_type"), nullable=False, index=True
    )
    status: Mapped[EventStatus] = mapped_column(
        SQLEnum(EventStatus, name="event_status"), nullable=False, index=True
    )
    tag: Mapped[EventTag] = mapped_column(
        SQLEnum(EventTag, name="event_tag"), nullable=False, default=EventTag.regular
    )  # only admins can edit tag

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    creator = relationship("User")
    collaborators = relationship(
        "EventCollaborator", back_populates="event", cascade="all, delete-orphan"
    )
    bot_submissions = relationship("EventBotSubmission", back_populates="event")


class EventBotSubmission(Base):
    """
    Telegram bot ingestion log for event posts.

    One row per /post attempt. Rejected / incomplete attempts are kept
    (no physical dedupe — product allows re-posts; moderation is ban-based).
    """

    __tablename__ = "event_bot_submissions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False)

    submitter_sub: Mapped[str] = mapped_column(
        ForeignKey("users.sub", ondelete="CASCADE"), nullable=False, index=True
    )
    submitter_telegram_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)

    status: Mapped[EventBotSubmissionStatus] = mapped_column(
        SQLEnum(EventBotSubmissionStatus, name="event_bot_submission_status"),
        nullable=False,
        index=True,
        default=EventBotSubmissionStatus.pending_extract,
    )
    reject_reason: Mapped[str | None] = mapped_column(nullable=True)

    event_id: Mapped[int | None] = mapped_column(
        ForeignKey("events.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Telegram provenance (informational; not unique)
    origin_type: Mapped[str | None] = mapped_column(nullable=True)
    origin_chat_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    origin_message_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    forward_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    forward_sender_name: Mapped[str | None] = mapped_column(nullable=True)
    media_file_unique_id: Mapped[str | None] = mapped_column(nullable=True)

    bot_chat_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    bot_message_id: Mapped[int] = mapped_column(BigInteger, nullable=False)

    raw_caption: Mapped[str | None] = mapped_column(nullable=True)
    raw_payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    extracted_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    registration_link: Mapped[str | None] = mapped_column(nullable=True)

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    submitter = relationship("User")
    event = relationship("Event", back_populates="bot_submissions")


# class EventAttendee(Base):
#     __tablename__ = "event_attendees"

#     id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False)
#     event_id: Mapped[int] = mapped_column(
#         ForeignKey("events.id", ondelete="CASCADE"), nullable=False
#     )
#     user_sub: Mapped[str] = mapped_column(
#         ForeignKey("users.sub", ondelete="CASCADE"), nullable=False
#     )
#     created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
#     updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now,
# nullable=False)
