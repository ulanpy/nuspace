from pydantic import BaseModel, ConfigDict
from ..auth.schemas import UserSchema
from typing import List
import uuid
from backend.core.database.models.product import ProductCategory, ProductCondition, ProductStatus


class ProductSchema(BaseModel):
    name: str 
    description: str
    price: int
    category: ProductCategory
    condition: ProductCondition
    status: ProductStatus = ProductStatus.active

    model_config = ConfigDict(from_attributes=True)


class ProductUpdateSchema(BaseModel):
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

class ProductReportSchema(BaseModel):
    product_id: int
    text: str

