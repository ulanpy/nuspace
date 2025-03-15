from enum import Enum as PyEnum
from typing import Optional
from sqlalchemy import Column,DateTime, ForeignKey, BigInteger, SQLEnum
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from datetime import datetime
from enum import Enum


from .base import Base


class ViewType(Enum):
    event = "event"
    story = "story"
    announcement = "announcement"

class ClubView(Base):
    __tablename__ = "club_views"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    entity_id: Mapped[int] = mapped_column(BigInteger, nullable=False)  # ID of event, story, or announcement
    entity_type: Mapped[ViewType] = mapped_column(SQLEnum(ViewType, name="view_type"), nullable=False)  # Type of entity
    views: Mapped[BigInteger] = mapped_column(BigInteger, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

