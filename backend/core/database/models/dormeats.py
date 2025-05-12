from enum import Enum
from statistics import mean

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Canteen(Base):  # create, read, update, delete
    __tablename__ = "canteen"
    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(String, nullable=False)

    meals = relationship("Meal", back_populates="canteen")
    canteen_feedbacks = relationship("CanteenFeedback", back_populates="canteen")
    canteen_reports = relationship("CanteenReport", back_populates="canteen")

    @hybrid_property
    def average_rating(self):
        ratings = [feedback.rating for feedback in self.canteen_feedback]
        return round(mean(ratings), 1) if ratings else None

    # available_meal = relationship("AvailableMeal", back_populates="canteen")
    # canteen_feedbacks = relationship("CanteenFeedback", back_populates="canteen")
    # canteen_reports = relationship("CanteenReport", back_populates="canteen")
    # Wasn't the code above written before?

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


class Meal(Base):  # create, read, update, delete
    __tablename__ = "meals"
    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped["MealCategory"] = mapped_column(
        SQLEnum(MealCategory, name="meal_category"), nullable=False
    )
    status: Mapped[bool] = mapped_column(Boolean, nullable=False)
    canteen_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("canteen.id"), nullable=False
    )
    status: Mapped[bool] = mapped_column(Boolean, nullable=False)

    canteen = relationship("Canteen", back_populates="meals")
    ingredient = relationship("Ingredient", back_populates="meals")


class CanteenProductCategory(Enum):
    veggies = "veggies"
    fruits = "fruits"
    cerial = "cerial"


class CanteenProduct(Base):
    __tablename__ = "canteenproducts"
    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(nullable=False, unique=True)
    category: Mapped["CanteenProductCategory"] = mapped_column(
        SQLEnum(CanteenProductCategory, name="canteenproduct_category"), nullable=False
    )

    ingredient = relationship("Ingredient", back_populates="canteen_product")


# Ingredient and Product classes aren't the same? Both are about ingredients (onion, carrot, etc...)
# what is the purpose of product and ingredient classes?
class Ingredient(Base):  # create, read, update, delete
    __tablename__ = "ingredient"
    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, nullable=False, index=True
    )
    meal_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("meals.id"), nullable=False
    )
    product_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("canteenproducts.id"), nullable=False
    )

    canteen_product = relationship("CanteenProduct", back_populates="ingredient")
    meals = relationship("Meal", back_populates="ingredient")


class CanteenFeedback(Base):  # create, read, update, delete
    __tablename__ = "canteen_feedback"
    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="rating_range"),
    )
    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, nullable=False, index=True
    )
    canteen_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("canteen.id"), nullable=False
    )
    feedback: Mapped[str] = mapped_column(String, nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)

    canteen = relationship("Canteen", back_populates="canteen_feedbacks")


class CanteenReport(Base):  # create, read, update, delete
    __tablename__ = "canteen_report"
    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, nullable=False, index=True
    )
    canteen_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("canteen.id"), nullable=False
    )
    report: Mapped[str] = mapped_column(String, nullable=False)

    canteen = relationship("Canteen", back_populates="canteen_reports")
