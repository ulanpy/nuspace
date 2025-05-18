from datetime import datetime
from enum import Enum

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class SenderType(Enum):
    user = "user"
    owner = "owner"


class ReviewableType(Enum):
    products = "products"
    events = "events"


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
    owner_id: Mapped[str] = mapped_column(nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="reviews")
    response = relationship("ReviewResponse", back_populates="review", uselist=False)


class ReviewResponse(Base):
    __tablename__ = "review_responses"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True, index=True)
    review_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("reviews.id"), unique=True, nullable=False
    )
    user_sub: Mapped[str] = mapped_column(ForeignKey("users.sub"), nullable=False)
    content: Mapped[str] = mapped_column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    review = relationship("Review", back_populates="response")
    owner = relationship("User", back_populates="review_responses")
