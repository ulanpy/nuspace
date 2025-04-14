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
