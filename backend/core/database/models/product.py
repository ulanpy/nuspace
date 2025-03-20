from .base import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List
from sqlalchemy import String, Integer, ForeignKey, BigInteger


class Product(Base):
    from backend.core.database.models.user import User
    __tablename__ = 'products'
    id: Mapped[int] = mapped_column(BigInteger, primary_key = True, index = True)
    name: Mapped[str] = mapped_column(String(255), index = True)
    description: Mapped[str] = mapped_column(String)
    price: Mapped[int] = mapped_column(Integer)
    userId: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    
    user: Mapped["User"] = relationship(back_populates = "products") #how to connect to a parameter in another table?
    pictures: Mapped[List["ProductPicture"]] = relationship(back_populates = "product")

class ProductPicture(Base):
    __tablename__ = 'product_picture'
    id: Mapped[int] = mapped_column(Integer, primary_key = True)
    productId: Mapped[int] = mapped_column(Integer, ForeignKey("products.id")) #connect with id of the product
    url: Mapped[str] = mapped_column(String)
    
    product: Mapped["Product"] = relationship(back_populates = "pictures")
