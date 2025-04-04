from pydantic import BaseModel, ConfigDict
from ..auth.schemas import UserSchema
from typing import List
import uuid
from backend.core.database.models.product import ProductCategory, ProductCondition, ProductStatus


class ProductSchema(BaseModel):
    name: str 
    description: str
    price: int
    user_sub: str
    category: ProductCategory  #Enum
    condition: ProductCondition  #Enum
    status: ProductStatus  #Enum

    model_config = ConfigDict(from_attributes=True)




class ProductCategorySchema(BaseModel):
    id: int
    name: str
    


