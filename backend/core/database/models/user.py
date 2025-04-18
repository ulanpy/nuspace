from enum import unique
from sqlalchemy import Column, Integer, String
from .base import Base
from sqlalchemy.orm import DeclarativeBase
from typing import List
from typing import Optional
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, BigInteger
from datetime import datetime, UTC
from sqlalchemy.dialects.postgresql import UUID
import uuid
from enum import Enum
from sqlalchemy import Integer, Enum as SQLEnum
from .product import Product

class UserRole(Enum):
    default = "default"
    admin = "admin"

class UserScope(Enum):
    allowed = "allowed"
    banned = "banned"

# Mapped[dtype] defaults parameters: nullable=False, unique=True, primary_key=False


class User(Base):
    __tablename__ = 'users'

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

    clubs_led = relationship("Club", back_populates="president_user")

    products = relationship("Product",back_populates = "user")
    product_feedbacks = relationship("ProductFeedback", back_populates="user")
    product_reports = relationship("ProductReport",back_populates="user")


