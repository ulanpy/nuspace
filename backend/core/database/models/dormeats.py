from .base import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List
from sqlalchemy import String, Integer, ForeignKey, BigInteger, DateTime, Column
from sqlalchemy import Integer, Enum as SQLEnum

from enum import Enum
from datetime import datetime, UTC

class Canteen(Base):
    __tablename__ = 'canteen'
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    description: Mapped[str] = mapped_column(nullable=False)

    meals = relationship("Meal", back_populates="canteen")

class Category(Enum):
    smoothies = "smoothies"
    salads = "salads"
    bowls = "bowls"
    drinks = "drinks"
    desserts = "desserts"
    meals = "meals"

class Meal():
    __tablename__ = 'meals'
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped["Category"] = mapped_column(SQLEnum(Category, name='meal_category'), nullable=False) 
    canteen_id: Mapped[int] = mapped_column(Integer, nullable=False)

    canteen = relationship("Canteen", back_populates="meals")