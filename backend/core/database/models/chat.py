from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey,CheckConstraint
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

class MessageSenderType(PyEnum):
    assistant = "assistant"
    user = "user"


class Chat(Base):
    __tablename__ = "chats"
    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, nullable=False, index=True
    )

    sub: Mapped[str] = mapped_column(ForeignKey("users.sub"), nullable=False)

    title: Mapped[str] = mapped_column(nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    user = relationship("User", back_populates="chats")
    messages: Mapped[list["Message"]] = relationship("Message", back_populates="chat", cascade="all, delete")


class Message(Base):
    __tablename__ = "messages"
    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, nullable=False, index=True
    )

    chat_id: Mapped[str] = mapped_column(
        ForeignKey("chat.id"), nullable=False, unique=False
    )

    sender_type: Mapped[MessageSenderType] = mapped_column(
        SQLEnum(MessageSenderType, name="type"), nullable=False
    )

    content: Mapped[str] = mapped_column(nullable=False, unique=False)

    chat: Mapped[Chat] = relationship("Chat", back_populates="messages")

    __table_args__ = (
        CheckConstraint("role IN ('user', 'assistant')", name="check_role"),
    )