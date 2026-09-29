from enum import Enum as PyEnum

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    PrimaryKeyConstraint,
    String,
    Text,
    text,
)
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.common.datetime_utils import utc_now
from backend.core.database.models.base import Base


class PageVisibility(PyEnum):
    """Who may see a page. Anything not visible to the viewer 404s, not 403s."""

    private = "private"
    internal = "internal"
    public = "public"


class Page(Base):
    __tablename__ = "pages"
    # Enforced in the database as well as the application: any writer that
    # bypasses `validate_slug` still cannot persist a reserved or malformed
    # slug. Declared here so a future autogenerate does not read the constraint
    # as drift and drop it.
    __table_args__ = (CheckConstraint("validate_slug(slug)", name="chk_pages_slug"),)
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False)
    name: Mapped[str] = mapped_column(nullable=False, unique=False, index=True)
    description: Mapped[str | None] = mapped_column(nullable=True, unique=False)
    visibility: Mapped[PageVisibility] = mapped_column(
        SQLEnum(PageVisibility, name="page_visibility"),
        nullable=False,
        default=PageVisibility.public,
        server_default=PageVisibility.public.value,
        index=True,
    )
    owner: Mapped[str | None] = mapped_column(
        ForeignKey("users.sub", ondelete="SET NULL"), nullable=True, index=True
    )
    slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    page_content: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    owner_user = relationship("User")
    page_admins = relationship("PageAdmin", back_populates="page", cascade="all, delete-orphan")


class PageAdmin(Base):
    __tablename__ = "page_admins"
    __table_args__ = (PrimaryKeyConstraint("page_id", "user_sub"),)

    page_id: Mapped[int] = mapped_column(
        ForeignKey("pages.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_sub: Mapped[str] = mapped_column(
        ForeignKey("users.sub", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    page = relationship("Page", back_populates="page_admins")
    user = relationship("User")


class PageAdminLink(Base):
    """Secret invite link that grants page-admin access on redemption."""

    __tablename__ = "page_admin_links"
    # At most one unrevoked link per page. A correctness constraint, not an
    # optimisation: a second live link would leave two valid secrets for one
    # page. Declared so autogenerate does not drop it as drift.
    __table_args__ = (
        Index(
            "uq_page_admin_links_active",
            "page_id",
            unique=True,
            postgresql_where=text("revoked_at IS NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False)
    page_id: Mapped[int] = mapped_column(
        ForeignKey("pages.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    created_by_sub: Mapped[str] = mapped_column(
        ForeignKey("users.sub", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
