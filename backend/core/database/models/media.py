from enum import unique
from sqlalchemy import Column, Integer, String
from .base import Base
from sqlalchemy.orm import DeclarativeBase
from typing import List
from typing import Optional
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, BigInteger
from datetime import datetime, UTC
from sqlalchemy.dialects.postgresql import UUID
import uuid
from enum import Enum
from sqlalchemy import Integer, Enum as SQLEnum

class MediaSection(Enum):
    kp = "kp"
    ev = "ev"
    de = "de"


class MediaPurpose(Enum):
    banner = "banner"
    vertical_image = "vertical_image"
    large_image = "large_image"
    thumbnail = "thumbnail"
    club_profile = "club_profile"
    club_event = "club_event"


# Mapped[dtype] defaults parameters: nullable=False, unique=True, primary_key=False
class Media(Base):
    __tablename__ = 'media'
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True, index=True)
    name: Mapped[str] = mapped_column(nullable=False, index=True, unique=True)
    mime_type: Mapped[str] = mapped_column(nullable=False, unique=False)
    section: Mapped[MediaSection] = mapped_column(SQLEnum(MediaSection, name="media_section"), nullable=False)
    entity_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True, unique=False)
    media_purpose: Mapped[MediaPurpose] = mapped_column(SQLEnum(MediaPurpose, name="media_purpose"), nullable=False)
    media_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # Add order field
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)




