from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import BigInteger, Column, DateTime, Integer
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .common_enums import EntityType


class MediaFormat(PyEnum):
    banner = "banner"
    carousel = "carousel"
    profile = "profile"


# Mapped[dtype] defaults parameters: nullable=False, unique=True, primary_key=False
class Media(Base):
    __tablename__ = "media"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True, index=True)
    name: Mapped[str] = mapped_column(nullable=False, index=True, unique=True)
    mime_type: Mapped[str] = mapped_column(nullable=False, unique=False)
    entity_type: Mapped[EntityType] = mapped_column(
        SQLEnum(EntityType, name="entity_type"), nullable=False
    )
    entity_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True, unique=False)
    media_format: Mapped[MediaFormat] = mapped_column(
        SQLEnum(MediaFormat, name="media_format"), nullable=False
    )
    media_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
