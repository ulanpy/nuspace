from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import BigInteger, Column, DateTime, Integer
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class MediaSection(PyEnum):
    kp = "kp"
    ev = "ev"
    de = "de"


class MediaPurpose(PyEnum):
    banner = "banner"
    vertical_image = "vertical_image"
    large_image = "large_image"
    thumbnail = "thumbnail"


# Mapped[dtype] defaults parameters: nullable=False, unique=True, primary_key=False
class Media(Base):
    __tablename__ = "media"
    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True, index=True
    )
    name: Mapped[str] = mapped_column(nullable=False, index=True, unique=True)
    mime_type: Mapped[str] = mapped_column(nullable=False, unique=False)
    section: Mapped[MediaSection] = mapped_column(
        SQLEnum(MediaSection, name="media_section"), nullable=False
    )
    entity_id: Mapped[int] = mapped_column(
        BigInteger, nullable=False, index=True, unique=False
    )
    media_purpose: Mapped[MediaPurpose] = mapped_column(
        SQLEnum(MediaPurpose, name="media_purpose"), nullable=False
    )
    media_order: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )  # Add order field
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
