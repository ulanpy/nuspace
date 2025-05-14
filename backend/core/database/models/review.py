from datetime import datetime

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .common_enums import EntityType


class Reviews(Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True, index=True)
    reviewable_type: Mapped[EntityType] = mapped_column(
        SQLEnum(EntityType, name="reviewable_type"), nullable=False
    )
    entity_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    user_sub: Mapped[str] = mapped_column(ForeignKey("users.sub"), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="reviews")
    response = relationship("ReviewResponses", back_populates="review", uselist=False)


class ReviewResponses(Base):
    __tablename__ = "review_responses"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True, index=True)
    review_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("reviews.id"), unique=True, nullable=False
    )
    user_sub: Mapped[str] = mapped_column(ForeignKey("users.sub"), nullable=False)
    content: Mapped[str] = mapped_column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    review = relationship("Reviews", back_populates="response")
    owner = relationship("User", back_populates="review_responses")
