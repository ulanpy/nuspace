from .base import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List
from sqlalchemy import String, Integer, ForeignKey, BigInteger
import uuid
from sqlalchemy.dialects.postgresql import UUID

class ProductCategory(Base):
    __tablename__ = 'product_category'
    id: Mapped[int] = mapped_column(BigInteger, primary_key = True, index = True)
    name: Mapped[str] = mapped_column(String(255), index = True)
    products: Mapped[List["Product"]] = relationship(back_populates = "category")

class Product(Base):
    __tablename__ = 'products'
    id: Mapped[int] = mapped_column(BigInteger, primary_key = True, index = True)
    name: Mapped[str] = mapped_column(String(255), index = True)
    description: Mapped[str] = mapped_column(String)
    price: Mapped[int] = mapped_column(Integer)
    user_sub: Mapped[str] = mapped_column(String, ForeignKey("users.sub"))
    categoryId: Mapped[int] = mapped_column(BigInteger, ForeignKey("product_category.id"))

    user: Mapped["User"] = relationship(back_populates = "products") #how to connect to a parameter in another table?
    category: Mapped["ProductCategory"] = relationship(back_populates = "products")
    pictures: Mapped[List["ProductPicture"]] = relationship(back_populates = "product")
    
class ProductPicture(Base):
    __tablename__ = 'product_picture'
    id: Mapped[int] = mapped_column(Integer, primary_key = True)
    productId: Mapped[int] = mapped_column(Integer, ForeignKey("products.id")) #connect with id of the product
    url: Mapped[str] = mapped_column(String)
    
    product: Mapped["Product"] = relationship(back_populates = "pictures")

class ProductFeedback(Base):
    __tablename__ = 'product_feedbacks'
    id: Mapped[int] = mapped_column(Integer, primary_key = True)