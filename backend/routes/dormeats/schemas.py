from pydantic import BaseModel, ConfigDict, Field
from typing import List
import uuid
from backend.core.database.models.product import ProductCategory, ProductCondition, ProductStatus
from backend.routes.google_bucket.schemas import MediaResponse
from datetime import datetime

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
    