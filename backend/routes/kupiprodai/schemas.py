from pydantic import BaseModel, ConfigDict
from ..auth.schemas import UserSchema
from typing import List
import uuid

class ProductSchema(BaseModel):
    name: str 
    description: str
    price: int
    userId: uuid.UUID
    categoryId: int

    model_config = ConfigDict(from_attributes = True)
    
class ProductPictureSchema(BaseModel):
    id: int
    productId: int
    url: str

    model_config = ConfigDict(from_attributes = True)

class ProductCategorySchema(BaseModel):
    id: int
    name: str
    
ProductSchema.model_rebuild()
ProductPictureSchema.model_rebuild()

