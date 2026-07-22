from datetime import datetime
from backend.common.datetime_utils import utc_now
from enum import Enum as PyEnum

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.database.models.base import Base


class UserRole(PyEnum):
    default = "default"
    admin = "admin"
    boss = "boss"
    capo = "capo"
    soldier = "soldier"
    community_admin = "community_admin"


class UserScope(PyEnum):
    allowed = "allowed"
    banned = "banned"


class User(Base):
    __tablename__ = "users"

    sub: Mapped[str] = mapped_column(primary_key=True, nullable=False, unique=True)
    email: Mapped[str] = mapped_column(nullable=False, unique=True, index=True)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole, name="userrole"), nullable=False)
    scope: Mapped[UserScope] = mapped_column(SQLEnum(UserScope, name="userscope"), nullable=False)
    name: Mapped[str] = mapped_column(nullable=False, index=True)
    surname: Mapped[str] = mapped_column(nullable=False, index=True)
    picture: Mapped[str] = mapped_column(nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    sg_assigned_at = Column(DateTime(timezone=True), nullable=True, index=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=True, index=True)

    # SG hierarchy column lives on users; one-way load only (no reverse graph on User).
    department_id: Mapped[int] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"), nullable=True
    )
    sg_assigned_by_sub: Mapped[str | None] = mapped_column(
        ForeignKey("users.sub", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    department = relationship("Department", foreign_keys=[department_id])
