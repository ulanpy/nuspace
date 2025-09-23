from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


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


# Mapped[dtype] defaults parameters: nullable=False, unique=True, primary_key=False


class User(Base):
    __tablename__ = "users"

    sub: Mapped[str] = mapped_column(primary_key=True, nullable=False, unique=True, index=True)
    email: Mapped[str] = mapped_column(nullable=False, unique=True, index=True)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole, name="userrole"), nullable=False)
    scope: Mapped[UserScope] = mapped_column(SQLEnum(UserScope, name="userscope"), nullable=False)
    name: Mapped[str] = mapped_column(nullable=False, index=True)
    surname: Mapped[str] = mapped_column(nullable=False, index=True)
    picture: Mapped[str] = mapped_column(nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=True, index=True)

    # Relationships for SGotinish hierarchy
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)

    department = relationship("Department", back_populates="users", foreign_keys=[department_id])

    communities_led = relationship("Community", back_populates="head_user")
    products = relationship("Product", back_populates="user")
    product_reports = relationship("ProductReport", back_populates="user")
    reviews = relationship("Review", back_populates="user")
    review_responses = relationship("ReviewReply", back_populates="user")
    events = relationship("Event", back_populates="creator")
    posts = relationship("CommunityPost", back_populates="user")
    communities = relationship("CommunityMember", back_populates="user")
