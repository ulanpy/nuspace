from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, Integer, DateTime
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class SenderType(PyEnum):
    assistant = "assistant"
    user = "user"
    system = "system"


class ModelType(PyEnum):
    GPT_4 = "gpt-4"
    GPT_3_5 = "gpt-3.5-turbo"
    GPT_4_TURBO = "gpt-4-turbo"


class RentalStatus(PyEnum):
    active = "active"
    expired = "expired"


class Chat(Base):
    __tablename__ = "chats"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    sub: Mapped[str] = mapped_column(ForeignKey("users.sub", ondelete='CASCADE'), nullable=False)
    model_type: Mapped[ModelType] = mapped_column(
        SQLEnum(ModelType, name="model_type"), nullable=False
    )
    user = relationship("User", back_populates="chats")
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan", passive_deletes=True)


class Message(Base):
    __tablename__ = "messages"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    chat_id: Mapped[int] = mapped_column(ForeignKey("chats.id", ondelete='CASCADE'), nullable=False)  # Updated table name from "chat.id"

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    content: Mapped[str] = mapped_column(nullable=False)

    sender_type: Mapped[SenderType] = mapped_column(
        SQLEnum(SenderType, name="sender_type"), nullable=False
    )
    chat = relationship("Chat", back_populates="messages")


class Rental(Base):
    __tablename__ = "rentals"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    sub: Mapped[str] = mapped_column(ForeignKey("users.sub"), nullable=False)
    start_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    end_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    status: Mapped[RentalStatus] = mapped_column(
        SQLEnum(RentalStatus), default=RentalStatus.active, nullable=False
    )

    user = relationship("User", back_populates="rentals")

    __table_args__ = (CheckConstraint("end_at > start_at", name="check_end_after_start"),)
