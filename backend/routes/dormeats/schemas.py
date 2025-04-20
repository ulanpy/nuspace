from typing import List

from pydantic import BaseModel, ConfigDict

from backend.core.database.models.dormeats import CanteenProductCategory, MealCategory
from backend.routes.google_bucket.schemas import MediaResponse


# Meal
class MealRequestSchema(BaseModel):
    name: str
    description: str
    price: int
    category: MealCategory
    canteen_id: int

    model_config = ConfigDict(from_attributes=True)


class MealResponseSchema(BaseModel):
    id: int
    name: str
    description: str
    price: int
    category: MealCategory
    media: List[MediaResponse] = []

    model_config = ConfigDict(from_attributes=True)


# Canteen Product
class CanteenProductRequestSchema(BaseModel):
    name: str
    category: CanteenProductCategory

    model_config = ConfigDict(from_attributes=True)


class CanteenProductResponseSchema(BaseModel):
    id: int
    name: str
    category: CanteenProductCategory
    media: List[MediaResponse] = []

    model_config = ConfigDict(from_attributes=True)


class IngredientSchema(BaseModel):
    id: int
    meal_id: int
    product_id: int


class CanteenSchema(BaseModel):
    id: int
    name: str
    description: str


# Available Meal
class AvailableMealRequestSchema(BaseModel):
    canteen_id: int
    meal_id: int
    status: bool

    model_config = ConfigDict(from_attributes=True)


class AvailableMealResponseSchema(BaseModel):
    id: int
    canteen_id: int
    meal_id: int
    status: bool

    model_config = ConfigDict(from_attributes=True)


# Canteen Feedback
class CanteenFeedbackSchema(BaseModel):
    id: int
    canteen_id: int
    feedback: str
    rating: int


# Canteen Report
class CanteenReportRequestSchema(BaseModel):
    canteen_id: int
    report: str

    model_config = ConfigDict(from_attributes=True)


class CanteenReportResponseSchema(BaseModel):
    id: int
    canteen_id: int
    report: str
    media: List[MediaResponse] = []

    model_config = ConfigDict(from_attributes=True)
