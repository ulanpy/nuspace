from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String, Text, Boolean
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class TicketStatus(PyEnum):
    open = "open"
    in_progress = "in_progress"
    closed = "closed"
    resolved = "resolved"


class TicketCategory(PyEnum):
    academic = "academic"
    administrative = "administrative"
    technical = "technical"
    complaint = "complaint"
    suggestion = "suggestion"
    other = "other"


class ConversationStatus(PyEnum):
    active = "active"
    archived = "archived"


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True, nullable=False)

    author_sub: Mapped[str] = mapped_column(
        ForeignKey("users.sub", ondelete="SET NULL"), nullable=True, index=True
    )
    category: Mapped[TicketCategory] = mapped_column(
        SQLEnum(TicketCategory, name="ticket_category"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(nullable=False)
    body: Mapped[str] = mapped_column(nullable=False)
    status: Mapped[TicketStatus] = mapped_column(
        SQLEnum(TicketStatus, name="ticket_status"), default=TicketStatus.open, nullable=False, index=True
    )
    is_anonymous: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    author = relationship("User")
    conversations = relationship("Conversation", back_populates="ticket", cascade="all, delete-orphan")


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True, nullable=False)

    ticket_id: Mapped[int] = mapped_column(
        ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sg_member_sub: Mapped[str] = mapped_column(
        ForeignKey("users.sub", ondelete="SET NULL"), nullable=True, index=True
    )
    status: Mapped[ConversationStatus] = mapped_column(
        SQLEnum(ConversationStatus, name="conversation_status"), default=ConversationStatus.active, nullable=False, index=True
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    ticket = relationship("Ticket", back_populates="conversations")
    sg_member = relationship("User")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True, nullable=False)

    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sender_sub: Mapped[str] = mapped_column(
        ForeignKey("users.sub", ondelete="SET NULL"), nullable=True, index=True
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_from_sg_member: Mapped[bool] = mapped_column(Boolean, nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User")
    read_statuses = relationship("MessageReadStatus", back_populates="message", cascade="all, delete-orphan")


class MessageReadStatus(Base):
    __tablename__ = "message_read_status"

    message_id: Mapped[int] = mapped_column(
        ForeignKey("messages.id", ondelete="CASCADE"), primary_key=True, nullable=False
    )
    user_sub: Mapped[str] = mapped_column(
        ForeignKey("users.sub", ondelete="CASCADE"), primary_key=True, nullable=False
    )
    read_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    message = relationship("Message", back_populates="read_statuses")
    user = relationship("User")


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)

    users = relationship("User", back_populates="department")


class PermissionType(PyEnum):
    VIEW = "view"
    ASSIGN = "assign"
    DELEGATE = "delegate"


class TicketAccess(Base):
    __tablename__ = "ticket_access"

    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), primary_key=True)
    user_sub: Mapped[str] = mapped_column(ForeignKey("users.sub", ondelete="CASCADE"), primary_key=True)
    permission: Mapped[PermissionType] = mapped_column(
        SQLEnum(PermissionType, name="permission_type"), primary_key=True
    )

    granted_by_sub: Mapped[str | None] = mapped_column(ForeignKey("users.sub", ondelete="SET NULL"), nullable=True)
    granted_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    ticket = relationship("Ticket")
    user = relationship("User", foreign_keys=[user_sub])
    granter = relationship("User", foreign_keys=[granted_by_sub])
