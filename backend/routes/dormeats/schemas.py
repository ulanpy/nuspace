from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
import uuid
from typing import Any
from backend.core.database.models.dormeats import MealCategory,  CanteenProductCategory
from backend.routes.google_bucket.schemas import MediaResponse

from pydantic import BaseModel, HttpUrl, EmailStr
from typing import Dict

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

class CanteenRequestSchema(BaseModel):
    id: int
    name: str
    description: str
    

class AvailableMealsSchema(BaseModel):
    id: int
    canteen_id: int
    meal_id: int
    status: bool

class CanteenFeedbackSchema(BaseModel):
    id: int
    canteen_id: int
    feedback: str
    rating: int
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

    