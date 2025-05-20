from datetime import datetime
from enum import Enum

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class ReviewableType(Enum):
    products = "products"
    club_events = "club_events"


class OwnerType(Enum):
    users = "users"
    clubs = "clubs"


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True, index=True)
    reviewable_type: Mapped[ReviewableType] = mapped_column(
        SQLEnum(ReviewableType, name="reviewable_type"), nullable=False
    )
    entity_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    user_sub: Mapped[str] = mapped_column(ForeignKey("users.sub"), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=True)
    owner_type: Mapped[OwnerType] = mapped_column(
        SQLEnum(OwnerType, name="owner_type"), nullable=False
    )
    owner_id: Mapped[str] = mapped_column(nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="reviews")
    reply = relationship(
        "ReviewReply", back_populates="review", uselist=False, cascade="all, delete-orphan"
    )


class ReviewReply(Base):
    __tablename__ = "review_replies"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True, index=True)
    review_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("reviews.id"), unique=True, nullable=False
    )
    user_sub: Mapped[str] = mapped_column(ForeignKey("users.sub"), nullable=False)
    content: Mapped[str] = mapped_column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    review = relationship("Review", back_populates="reply")
    user = relationship("User", back_populates="review_responses")
