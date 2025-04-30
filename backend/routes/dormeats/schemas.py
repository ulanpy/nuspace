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
    status: bool

    model_config = ConfigDict(from_attributes=True)


class MealResponseSchema(BaseModel):
    id: int
    name: str
    description: str
    price: int
    category: MealCategory
    # Shouldn't there be canteen_id?????
    status: bool
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


class IngredientRequestSchema(BaseModel):
    meal_id: int
    product_id: int

    model_config = ConfigDict(from_attribute=True)

class IngredientResponseSchema(BaseModel):
    id: int
    meal_id: int
    product_id: int

    model_config = ConfigDict(from_attribute=True)

class CanteenRequestSchema(BaseModel):
    name: str
    description: str
    


# Canteen Feedback
class CanteenFeedbackRequestSchema(BaseModel):
    canteen_id: int
    feedback: str
    rating: int

    model_config = ConfigDict(from_attributes=True)


class CanteenFeedbackResponseSchema(BaseModel):
    id: int
    canteen_id: int
    feedback: str
    rating: int

    model_config = ConfigDict(from_attributes=True)


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
