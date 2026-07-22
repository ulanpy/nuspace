from datetime import datetime
from backend.common.datetime_utils import utc_now
from enum import Enum as PyEnum

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.core.database.models.base import Base
from backend.modules.media.models import EntityType


class NotificationType(str, PyEnum):
    """Enum representing different types of notifications.

    ⚠️  IMPORTANT: When adding new values to this enum:
    1. Add the new value to this Python enum class
    2. Create a new Alembic migration manually (alembic revision -m "add_new_notification_type")
    3. In the migration's upgrade() function, add:
       op.execute("ALTER TYPE notification_type ADD VALUE 'your_new_value'")
    4. Run the migration: alembic upgrade head

    Alembic cannot auto-detect enum value changes, so manual migration is required!
    """

    info = "info"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    message: Mapped[str] = mapped_column(String, nullable=False)
    notification_source: Mapped[EntityType] = mapped_column(String, nullable=False)
    receiver_sub: Mapped[str] = mapped_column(ForeignKey("users.sub"), nullable=False)
    type: Mapped[NotificationType] = mapped_column(String, nullable=False)
    tg_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    url: Mapped[str] = mapped_column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
