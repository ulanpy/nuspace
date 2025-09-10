from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

class PianoRoomBooking(Base):
    __tablename__ = "piano_room_bookings"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    reservator_sub: Mapped[str] = mapped_column(ForeignKey("users.sub"), nullable=False)
    start_datetime: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_datetime: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    cancelled_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    reservator = relationship("User", back_populates="piano_room_bookings")