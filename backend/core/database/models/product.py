from .base import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List
from sqlalchemy import String, Integer, ForeignKey, BigInteger, Column, DateTime
from datetime import datetime
from sqlalchemy.types import Enum as SQLEnum
import uuid
from sqlalchemy.dialects.postgresql import UUID
from enum import Enum
import pytz

class ProductCondition(Enum):
    new = "New"
    like_new = "Like New"
    used = "Used"

class ProductCategory(Enum):
    books = "Books"
    electronics = "Electronics"

class ProductStatus(Enum):
    sold = "Sold"
    active = "Active"

class Product(Base):
    __tablename__ = 'products'
    id: Mapped[int] = mapped_column(BigInteger, primary_key = True, index = True, nullable = False)
    name: Mapped[str] = mapped_column(String(255), index = True, nullable = False)
    description: Mapped[str] = mapped_column(String)
    price: Mapped[int] = mapped_column(Integer, nullable = False)
    condition: Mapped["ProductCondition"] = mapped_column(SQLEnum(ProductCondition, name = "product_condition"), nullable = False)
    created_at = Column(DateTime(timezone = True), default=datetime.now(pytz.timezone("Asia/Almaty")), nullable=False)
    updated_at = Column(DateTime(timezone = True), default=datetime.now(pytz.timezone("Asia/Almaty")), onupdate=datetime.now(pytz.timezone("Asia/Almaty")), nullable=False)
    user_sub: Mapped[str] = mapped_column(String, ForeignKey("users.sub"), nullable = False)
    
    status: Mapped["ProductStatus"] = mapped_column(SQLEnum(ProductStatus, name = "product_status"), nullable = False)
    category: Mapped["ProductCategory"] = mapped_column(SQLEnum(ProductCategory, name = "product_category"), nullable = False)

    user: Mapped["User"] = relationship(back_populates = "products")
    feedbacks: Mapped[List["ProductFeedback"]] = relationship(back_populates = "product")
    reports: Mapped[List['ProductReport']] = relationship(back_populates = 'product')

class ProductFeedback(Base):
    __tablename__ = 'product_feedbacks'
    id: Mapped[int] = mapped_column(Integer, primary_key = True)
    userId: Mapped[uuid.UUID] = mapped_column(UUID, ForeignKey("users.id"))
    productId: Mapped[int] = mapped_column(Integer, ForeignKey("products.id"))
    text: Mapped[str] = mapped_column(String)
    created_at = Column(DateTime(timezone = True), default=datetime.now(pytz.timezone("Asia/Almaty")), nullable=False)

    user: Mapped["User"] = relationship(back_populates = "products_feedbacks")
    product: Mapped["Product"] = relationship(back_populates = "feedbacks")

class ProductReport(Base):
    __tablename__ = 'product_reports'
    id: Mapped[int] = mapped_column(Integer, primary_key = True)
    userId: Mapped[uuid.UUID] = mapped_column(UUID, ForeignKey("users.id"))
    productId: Mapped[int] = mapped_column(Integer, ForeignKey("products.id"))
    text: Mapped[str] = mapped_column(String)
    created_at = Column(DateTime(timezone = True), default=datetime.now(pytz.timezone("Asia/Almaty")), nullable=False)

    user: Mapped["User"] = relationship(back_populates = "product_reports")
    product: Mapped["Product"] = relationship(back_populates = "reports")