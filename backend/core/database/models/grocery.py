from .base import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import BigInteger, String, Integer, ForeignKey
from typing import List

class GroceryCategory(Base):
    __tablename__ = "grocery_category"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    groceries: Mapped[List["Grocery"]] = relationship(back_populates="category")


class Company(Base):
    __tablename__ = "company"
    id: Mapped[int] = mapped_column(BigInteger, index=True, primary_key=True)
    name: Mapped[str] = mapped_column(String, index=True)
    groceries: Mapped[List["Grocery"]] = relationship(back_populates="company")


class Grocery(Base):
    __tablename__ = "grocery"
    id: Mapped[int] = mapped_column(BigInteger, index=True, primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity: Mapped[int] = mapped_column(BigInteger)

    category_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("grocery_category.id"), nullable=False)
    company_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("company.id"), nullable=False)

    category: Mapped["GroceryCategory"] = relationship(back_populates="groceries")
    company: Mapped["Company"] = relationship(back_populates="groceries")
    feedbacks: Mapped[List["GroceryFeedback"]] = relationship(back_populates="grocery")



class GroceryFeedback(Base):
	__tablename__ = "grocery_feedback"
	id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
	rating: Mapped[int] = mapped_column(Integer)  
	comment: Mapped[str] = mapped_column(String(500), nullable=True)

	user_id: Mapped[int] = mapped_column(BigInteger) 
	grocery_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("grocery.id"))

	grocery: Mapped["Grocery"] = relationship(back_populates="feedbacks")
