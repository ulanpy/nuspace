from pydantic import BaseModel, ConfigDict
from ..auth.schemas import UserSchema
from typing import List
import uuid
from backend.core.database.models.product import ProductCondition, ProductCategory, ProductStatus

class ProductSchema(BaseModel):
    name: str 
    description: str
    price: int
    condition: ProductCondition
    user_sub: str
    category: ProductCategory
    status: ProductStatus

    model_config = ConfigDict(from_attributes = True)
    
class ProductCategorySchema(BaseModel):
    id: int
    name: str
    
ProductSchema.model_rebuild()
ProductCategorySchema.model_rebuild()

