from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, PrimaryKeyConstraint, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from backend.common.datetime_utils import utc_now
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


class EventAccessPurpose(PyEnum):
    transfer = "transfer"
    co_view = "co_view"


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


class EventAttendee(Base):
    __tablename__ = "event_attendees"
    __table_args__ = (PrimaryKeyConstraint("event_id", "user_sub"),)

    event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_sub: Mapped[str] = mapped_column(
        ForeignKey("users.sub", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class EventAccessInvite(Base):
    """Secret invite link: transfer ownership or share attendee-list access."""

    __tablename__ = "event_access_invites"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False)
    event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    purpose: Mapped[EventAccessPurpose] = mapped_column(
        SQLEnum(EventAccessPurpose, name="event_access_purpose"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    created_by_sub: Mapped[str] = mapped_column(
        ForeignKey("users.sub", ondelete="CASCADE"), nullable=False, index=True
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    accepted_by_sub: Mapped[str | None] = mapped_column(
        ForeignKey("users.sub", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class EventAttendeeViewer(Base):
    """Users granted co-view access to an event's attendee list (not full ownership)."""

    __tablename__ = "event_attendee_viewers"
    __table_args__ = (PrimaryKeyConstraint("event_id", "user_sub"),)

    event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_sub: Mapped[str] = mapped_column(
        ForeignKey("users.sub", ondelete="CASCADE"), nullable=False, index=True
    )
    granted_by_sub: Mapped[str] = mapped_column(
        ForeignKey("users.sub", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
