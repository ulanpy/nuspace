from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import BigInteger, Column, DateTime, Integer
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from backend.core.database.models.base import Base


class EntityType(str, PyEnum):
    """Enum representing different types of entities (db table names).

    ⚠️  IMPORTANT: When adding new values to this enum:
    1. Add the new value to this Python enum class
    2. Create a new Alembic migration manually (alembic revision -m "add_new_entity_type")
    3. In the migration's upgrade() function, add:
       op.execute("ALTER TYPE entity_type ADD VALUE 'your_new_value'")
    4. Run the migration: alembic upgrade head

    Alembic cannot auto-detect enum value changes, so manual migration is required!
    """

    community_events = "community_events"
    communities = "communities"
    grade_reports = "grade_reports"
    courses = "courses"
    tickets = "tickets"
    messages = "messages"


class MediaFormat(PyEnum):
    banner = "banner"
    carousel = "carousel"
    profile = "profile"


class Media(Base):
    __tablename__ = "media"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(nullable=False, index=True, unique=True)
    mime_type: Mapped[str] = mapped_column(nullable=False, unique=False)
    entity_type: Mapped[EntityType] = mapped_column(
        SQLEnum(EntityType, name="entity_type"), nullable=False, index=True
    )
    entity_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True, unique=False)
    media_format: Mapped[MediaFormat] = mapped_column(
        SQLEnum(MediaFormat, name="media_format"), nullable=False, index=True
    )
    media_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
