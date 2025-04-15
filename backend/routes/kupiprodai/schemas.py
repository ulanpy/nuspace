from pydantic import BaseModel, ConfigDict, Field
from typing import List
import uuid
from backend.core.database.models.product import ProductCategory, ProductCondition, ProductStatus
from backend.routes.google_bucket.schemas import MediaResponse
from datetime import datetime

class ProductRequestSchema(BaseModel):
    name: str
    description: str
    price: int = Field(..., ge=1, le=10_000_000_000, description="Price of the product in whole currency units (1 to 10,000,000)")
    category: ProductCategory
    condition: ProductCondition
    status: ProductStatus = ProductStatus.active

    model_config = ConfigDict(from_attributes=True)


class ProductResponseSchema(BaseModel):
    id: int
    name: str 
    description: str
    user_name: str
    user_surname: str
    user_telegram_id: int
    price: int
    category: ProductCategory
    condition: ProductCondition
    status: ProductStatus = ProductStatus.active
    updated_at: datetime
    created_at: datetime
    media: List[MediaResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ListResponseSchema(BaseModel):
    products: List[ProductResponseSchema]
    num_of_pages: int

class ProductUpdateSchema(BaseModel):
    product_id: int
    name: str | None = None
    description: str | None = None
    price: int | None = None
    category: ProductCategory | None = None
    condition: ProductCondition | None = None
    status: ProductStatus | None = None

    class Config:
        from_attributes = True  # Make sure it can be used with SQLAlchemy models
    
class ProductFeedbackSchema(BaseModel):
    product_id: int
    text: str
    
class ProductFeedbackResponseSchema(BaseModel):
    id: int
    user_name: str
    user_surname: str
    product_id: int
    text: str
    created_at: datetime

class ListProductFeedbackResponseSchema(BaseModel):
    product_feedbacks: List[ProductFeedbackResponseSchema]
    num_of_pages: int

class ProductReportSchema(BaseModel):
    product_id: int
    text: str

