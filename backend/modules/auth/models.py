from enum import Enum as PyEnum

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Identity, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.common.datetime_utils import utc_now
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


class UserCategory(PyEnum):
    """Which side of the university a person is on.

    Not a permission axis, which is what `UserRole` is: this is what the
    directory badges people by, and what a card is filtered by. Someone on the
    student government is a `capo` by role and a `student` by category, and both
    facts are wanted at once.
    """

    student = "student"
    faculty = "faculty"
    staff = "staff"


class User(Base):
    __tablename__ = "users"

    sub: Mapped[str] = mapped_column(primary_key=True, nullable=False, unique=True)
    # Surrogate key, sequence-backed in the database. User media hangs off this
    # int; `sub` stays the primary key and every FK to it is untouched.
    id: Mapped[int] = mapped_column(BigInteger, Identity(), nullable=False, unique=True)
    email: Mapped[str] = mapped_column(nullable=False, unique=True, index=True)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole, name="userrole"), nullable=False)
    scope: Mapped[UserScope] = mapped_column(SQLEnum(UserScope, name="userscope"), nullable=False)
    name: Mapped[str] = mapped_column(nullable=False, index=True)
    surname: Mapped[str] = mapped_column(nullable=False, index=True)
    picture: Mapped[str] = mapped_column(nullable=True)
    slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    # Which side of the university this person is on. Defaults to `student`
    # because everyone at the university is one until they say otherwise, and
    # a NULL here would mean every card and every filter has to handle it.
    # `server_default` is declared as well as `default` so `alembic check` sees
    # the migration and the model agree.
    category: Mapped[UserCategory] = mapped_column(
        SQLEnum(UserCategory, name="usercategory"),
        nullable=False,
        default=UserCategory.student,
        server_default="student",
    )
    page_content: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    is_page_public: Mapped[bool] = mapped_column(nullable=False, default=False)
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
