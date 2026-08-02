from enum import Enum as PyEnum

from backend.common.datetime_utils import utc_now
from backend.core.database.models.base import Base
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship


class TicketStatus(PyEnum):
    open = "open"
    in_progress = "in_progress"
    closed = "closed"
    resolved = "resolved"


class TicketCategory(PyEnum):
    """One category per SG ministry (slug == SgMinistry.slug)."""

    education = "education"
    culture = "culture"
    research = "research"
    residential = "residential"
    sports = "sports"
    student_rights = "student_rights"
    student_fund = "student_fund"
    external_affairs = "external_affairs"


class SgMinistry(Base):
    """SG ministry inbox: telegram_chat_id nullable → fallback TELEGRAM_CHAT_ID."""

    __tablename__ = "sg_ministries"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    telegram_chat_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    tickets = relationship("Ticket", back_populates="ministry")


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False)
    category: Mapped[TicketCategory] = mapped_column(
        SQLEnum(TicketCategory, name="ticket_category", native_enum=True),
        nullable=False,
        index=True,
    )
    ministry_id: Mapped[int] = mapped_column(
        ForeignKey("sg_ministries.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[TicketStatus] = mapped_column(
        SQLEnum(TicketStatus, name="ticket_status"),
        default=TicketStatus.open,
        nullable=False,
        index=True,
    )
    author_telegram_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    assignee_telegram_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    ministry = relationship("SgMinistry", back_populates="tickets")
    telegram_messages = relationship(
        "TicketTelegramMessage",
        back_populates="ticket",
        cascade="all, delete-orphan",
    )


class TicketTelegramMessage(Base):
    """Maps any bot-related Telegram message_id to a ticket (DM or ministry chat)."""

    __tablename__ = "ticket_telegram_messages"
    __table_args__ = (
        UniqueConstraint("chat_id", "telegram_message_id", name="uq_ticket_tg_msg_chat_message"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False)
    ticket_id: Mapped[int] = mapped_column(
        ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    chat_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    telegram_message_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    ticket = relationship("Ticket", back_populates="telegram_messages")


class Department(Base):
    """Kept for users.department_id FK; NU academic departments, not SG ministries."""

    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    is_special: Mapped[bool] = mapped_column(default=False, nullable=False)
