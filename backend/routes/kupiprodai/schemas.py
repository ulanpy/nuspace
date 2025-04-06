from pydantic import BaseModel, ConfigDict
from typing import List
import uuid
from backend.core.database.models.product import ProductCategory, ProductCondition, ProductStatus
from backend.routes.google_bucket.schemas import MediaResponse

class ProductRequestSchema(BaseModel):
    name: str
    description: str
    price: int
    category: ProductCategory
    condition: ProductCondition
    status: ProductStatus = ProductStatus.active

    model_config = ConfigDict(from_attributes=True)


class ProductResponseSchema(BaseModel):
    id: int
    name: str 
    description: str
    price: int
    category: ProductCategory
    condition: ProductCondition
    status: ProductStatus = ProductStatus.active
    media: List[MediaResponse] = []

    model_config = ConfigDict(from_attributes=True)


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


class ProductCategorySchema(BaseModel):
    id: int
    name: str
    


