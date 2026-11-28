from enum import Enum as PyEnum

from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, Text, select, true
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.common.datetime_utils import utc_now
from backend.core.database.models.base import Base
from backend.modules.pages.models.page import PageVisibility


class UserRole(PyEnum):
    default = "default"
    admin = "admin"
    boss = "boss"
    capo = "capo"
    soldier = "soldier"


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
    # Whether attended events that are cancelled or moved reach this person on Telegram.
    event_notifications: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=true()
    )

    # SG hierarchy column lives on users; one-way load only (no reverse graph on User).
    department_id: Mapped[int] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"), nullable=True
    )
    sg_assigned_by_sub: Mapped[str | None] = mapped_column(
        ForeignKey("users.sub", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # The profile page (#434). It has no table of its own, so deleting the
    # account deletes it. It exists only once `handle` is set.
    handle: Mapped[str | None] = mapped_column(Text, nullable=True, unique=True, index=True)
    profile_visibility: Mapped[PageVisibility] = mapped_column(
        SQLEnum(PageVisibility, name="page_visibility"),
        nullable=False,
        default=PageVisibility.private,
        server_default=PageVisibility.private.value,
    )
    profile_content: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Bucket object names (#435). No `media` row represents them: its entity_id
    # is a bigint and cannot hold `sub`. A custom picture overrides `picture`.
    profile_picture: Mapped[str | None] = mapped_column(Text, nullable=True)
    profile_banner: Mapped[str | None] = mapped_column(Text, nullable=True)

    department = relationship("Department", foreign_keys=[department_id])

    # The department's name as a search document field (profiles index, #440).
    # The instance reads a loaded `department`; the class is a scalar subquery
    # so a rebuild can select it from SQL like any column.
    @hybrid_property
    def department_name(self) -> str | None:
        return self.department.name if self.department else None

    @department_name.inplace.expression
    @classmethod
    def _department_name_expression(cls):
        from backend.modules.sgotinish.models import Department

        return (
            select(Department.name)
            .where(Department.id == cls.department_id)
            .scalar_subquery()
            .label("department_name")
        )
