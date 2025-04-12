from .base import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List
from sqlalchemy import String, Integer, ForeignKey, BigInteger, DateTime, Column, Boolean
from sqlalchemy import Integer, CheckConstraint, Enum as SQLEnum
from sqlalchemy.ext.hybrid import hybrid_property
from statistics import mean

from enum import Enum
from datetime import datetime, UTC

class Canteen(Base):
    __tablename__ = 'canteen'
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    description: Mapped[str] = mapped_column(String, nullable=False)

    meals = relationship("Meal", back_populates="canteen")
    available_meals = relationship("AvailableMeals", back_populates="canteen")
    canteen_feedback = relationship("CanteenFeedback", back_populates="canteen")
    canteen_report = relationship("CanteenReport", back_populates="canteen")

    @hybrid_property
    def average_rating(self):
        ratings = [feedback.rating for feedback in self.canteen_feedback]
        return round(mean(ratings), 1) if ratings else None

class Category(Enum):
    smoothies = "smoothies"
    salads = "salads"
    bowls = "bowls"
    drinks = "drinks"
    desserts = "desserts"
    meals = "meals"

class Meal(Base):
    __tablename__ = 'meals'
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped["Category"] = mapped_column(SQLEnum(Category, name='meal_category'), nullable=False) 
    canteen_id: Mapped[int] = mapped_column(Integer, ForeignKey('canteen.id'), nullable=False)

    canteen = relationship("Canteen", back_populates="meals")
    available_meals = relationship("AvailableMeals", back_populates="meal")
    

class CanteenProduct(Base):
    __tablename__= 'canteen_products'
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[str] = mapped_column(nullable=False)

# Ingredient and Product classes aren't the same? Both are about ingredients (onion, carrot, etc...)
# what is the purpose of product and ingredient classes?
class Ingredient(Base):
    __tablename__= 'ingredient'
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    meal_id: Mapped[int] = mapped_column(BigInteger, ForeignKey('meals.id'), nullable=False)
    product_id: Mapped[int] = mapped_column(BigInteger, ForeignKey('products.id'), nullable=False)

class AvailableMeals(Base):
    __tablename__ = "available_meals"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    canteen_id: Mapped[int] = mapped_column(Integer, ForeignKey('canteen.id'), nullable=False)
    meal_id: Mapped[int] = mapped_column(Integer, ForeignKey('meals.id'))
    status: Mapped[bool] = mapped_column(Boolean, nullable=False)

    canteen = relationship("Canteen", back_populates="available_meals")
    meal = relationship("Meal", back_populates="available_meals")

class CanteenFeedback(Base):
    __tablename__ = "canteen_feedback"
    __table_args__ = (
        CheckConstraint('rating >= 1 AND rating <= 5', name="rating_range"),
    )
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    canteen_id: Mapped[int] = mapped_column(Integer, ForeignKey('canteen.id'), nullable=False)
    feedback: Mapped[str] = mapped_column(String, nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)

    canteen = relationship("Canteen", back_populates="canteen_feedback")

class CanteenReport(Base):
    __tablename__ = "canteen_report"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    canteen_id: Mapped[int] = mapped_column(Integer, ForeignKey('canteen.id'), nullable=False)
    report: Mapped[str] = mapped_column(String, nullable=False)

    canteen = relationship("Canteen", back_populates="canteen_report")
