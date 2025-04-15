from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
import uuid
from typing import Any
from backend.core.database.models.user import UserRole, UserScope

from pydantic import BaseModel, HttpUrl, EmailStr
from typing import Dict
from .dormeats import *

class MealSchema(BaseModel):
    id: int
    name: str
    description: str
    price: int
    category: MealCategory
    canteen_id: int

class CanteenProductSchema(BaseModel):
    id: int
    name: str
    category: CanteenProductCategory

class IngredientSchema(BaseModel):
    id: int
    meal_id: int
    product_id: int

class CanteenSchema(BaseModel):
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

class CanteenReportSchema(BaseModel):
    id: int
    canteen_id: int
    report: str
    