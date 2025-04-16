from .base import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List
from sqlalchemy import String, Integer, ForeignKey, BigInteger, DateTime, Column, Boolean
from sqlalchemy import Integer, CheckConstraint, Enum as SQLEnum
from sqlalchemy.ext.hybrid import hybrid_property
from statistics import mean

from enum import Enum
from datetime import datetime, UTC

class Canteen(Base): #create, read, update, delete
    __tablename__ = 'canteen'
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(String, nullable=False)

    meals = relationship("Meal", back_populates="canteen")
    available_meals = relationship("AvailableMeals", back_populates="canteen")
    canteen_feedbacks = relationship("CanteenFeedback", back_populates="canteen")
    canteen_reports = relationship("CanteenReport", back_populates="canteen")

    @hybrid_property
    def average_rating(self):
        ratings = [feedback.rating for feedback in self.canteen_feedback]
        return round(mean(ratings), 1) if ratings else None

class MealCategory(Enum):
    smoothies = "smoothies"
    salads = "salads"
    bowls = "bowls"
    drinks = "drinks"
    desserts = "desserts"
    meals = "meals"

class Meal(Base): #create, read, update, delete
    __tablename__ = 'meals'
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped["MealCategory"] = mapped_column(SQLEnum(MealCategory, name='meal_category'), nullable=False) 
    canteen_id: Mapped[int] = mapped_column(Integer, ForeignKey('canteen.id'), nullable=False)

    canteen = relationship("Canteen", back_populates="meals")
    available_meals = relationship("AvailableMeals", back_populates="meals")
    ingredient = relationship("Ingredient", back_populates="meals")

class CanteenProductCategory(Enum):
    veggies = "Овощи"
    fruits = "Фрукты"
    cerial = "Крупы"

class CanteenProduct(Base):
    __tablename__= 'canteenproducts'
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(nullable=False, unique = True)
    category: Mapped["CanteenProductCategory"] = mapped_column(SQLEnum(CanteenProductCategory, name='canteenproduct_category'), nullable = False)

    ingredient = relationship("Ingredient", back_populates="canteenproducts")

# Ingredient and Product classes aren't the same? Both are about ingredients (onion, carrot, etc...)
# what is the purpose of product and ingredient classes?
class Ingredient(Base): #create, read, update, delete
    __tablename__= 'ingredient'
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    meal_id: Mapped[int] = mapped_column(BigInteger, ForeignKey('meals.id'), nullable=False)
    product_id: Mapped[int] = mapped_column(BigInteger, ForeignKey('products.id'), nullable=False)

    canteenproducts = relationship("CanteenProduct", back_populates="ingredient")
    meals = relationship("Meal", back_populates="ingredient")

class AvailableMeals(Base):
    __tablename__ = "available_meals"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    canteen_id: Mapped[int] = mapped_column(Integer, ForeignKey('canteen.id'), nullable=False)
    meal_id: Mapped[int] = mapped_column(Integer, ForeignKey('meals.id'))
    status: Mapped[bool] = mapped_column(Boolean, nullable=False)

    canteen = relationship("Canteen", back_populates="available_meals")
    meals = relationship("Meal", back_populates="available_meals")

class CanteenFeedback(Base): #create, read, update, delete
    __tablename__ = "canteen_feedback"
    __table_args__ = (
        CheckConstraint('rating >= 1 AND rating <= 5', name="rating_range"),
    )
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    canteen_id: Mapped[int] = mapped_column(Integer, ForeignKey('canteen.id'), nullable=False)
    feedback: Mapped[str] = mapped_column(String, nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)

    canteen = relationship("Canteen", back_populates="canteen_feedback")

class CanteenReport(Base): #create, read, update, delete
    __tablename__ = "canteen_report"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False, index=True)
    canteen_id: Mapped[int] = mapped_column(Integer, ForeignKey('canteen.id'), nullable=False)
    report: Mapped[str] = mapped_column(String, nullable=False)

    canteen = relationship("Canteen", back_populates="canteen_report")
