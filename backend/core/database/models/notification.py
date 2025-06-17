from datetime import datetime

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.core.database.models.base import Base
from backend.core.database.models.common_enums import EntityType, NotificationType


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
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
