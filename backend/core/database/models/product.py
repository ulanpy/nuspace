from datetime import datetime
from enum import Enum

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class ProductCondition(Enum):
    new = "new"
    like_new = "like_new"
    used = "used"


class ProductCategory(Enum):
    books = "books"
    electronics = "electronics"
    clothing = "clothing"
    furniture = "furniture"
    appliances = "appliances"
    sports = "sports"
    stationery = "stationery"
    art_supplies = "art_supplies"
    beauty = "beauty"
    services = "services"
    food = "food"
    tickets = "tickets"
    transport = "transport"
    others = "others"


class ProductStatus(Enum):
    inactive = "inactive"
    active = "active"


class Product(Base):
    __tablename__ = "products"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    description: Mapped[str] = mapped_column(String)
    price: Mapped[int] = mapped_column(BigInteger, nullable=False)
    user_sub: Mapped[str] = mapped_column(String, ForeignKey("users.sub"), nullable=False)
    category: Mapped["ProductCategory"] = mapped_column(
        SQLEnum(ProductCategory, name="product_category"), nullable=False
    )
    condition: Mapped["ProductCondition"] = mapped_column(
        SQLEnum(ProductCondition, name="product_condition"), nullable=False
    )
    status: Mapped["ProductStatus"] = mapped_column(
        SQLEnum(ProductStatus, name="product_status"), nullable=False
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="products")

    reports = relationship("ProductReport", back_populates="product", cascade="all, delete-orphan")


class ProductReport(Base):
    __tablename__ = "product_reports"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_sub: Mapped[str] = mapped_column(ForeignKey("users.sub"), nullable=False)
    product_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("products.id"))
    text: Mapped[str] = mapped_column(String)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="product_reports")
    product = relationship("Product", back_populates="reports")
