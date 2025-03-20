from pydantic import BaseModel, ConfigDict
from ..auth.schemas import UserSchema
from typing import List

class ProductSchema(BaseModel):
    id: int
    name: str 
    description: str
    price: int
    userId: int
    user: "UserSchema" #UserSchema needs to be updated so that it contains products column
    pictures: List["ProductPictureSchema"]

    model_config = ConfigDict(from_attributes = True)
    
class ProductPictureSchema(BaseModel):
    id: int
    productId: int
    product: "ProductSchema"
    url: str

    model_config = ConfigDict(from_attributes = True)


ProductSchema.model_rebuild()
ProductPictureSchema.model_rebuild()

