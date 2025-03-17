from .base import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import String, Integer, List, ForeignKey, BigInteger
from .user import User

class Product(Base):
    __tablename__ = 'products'
    id: Mapped[int] = mapped_column(BigInteger, primary_key = True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(String)
    price: Mapped[int] = mapped_column(Integer)
    userId: Mapped["User"] = relationship("User", back_populates = "products") #how to connect to a parameter in another table?
    pictures: Mapped[List["ProductPicture"]] = mapped_column(back_populates = "product")

class ProductPicture(Base):
    __tablename__ = 'product_picture'
    id: Mapped[int] = mapped_column(Integer, primary_key = True)
    productId: Mapped[int] = mapped_column(Integer, ForeignKey("products.id")) #connect with id of the product
    product: Mapped["Product"] = relationship(back_populates = "pictures")
    url: Mapped[str] = mapped_column(String)