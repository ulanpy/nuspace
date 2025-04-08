from pydantic import BaseModel, ConfigDict
from typing import Optional, List
import uuid


class GroceryCategorySchema(BaseModel):
	id: int
	name: str
	model_config = ConfigDict(from_attributes=True)


class CompanySchema(BaseModel):
	id: int
	name: str
	model_config = ConfigDict(from_attributes=True)


class GroceryFeedbackSchema(BaseModel):
	id: int
	rating: int
	comment: Optional[str] = None
	user_id: int
	grocery_id: int

	model_config = ConfigDict(from_attributes=True)




class GrocerySchema(BaseModel):
	id: int
	name: str
	price: int
	quantity: int
	category_id: int
	company_id: int
	category: Optional[GroceryCategorySchema] = None
	company: Optional[CompanySchema] = None
	feedbacks: Optional[List[GroceryFeedbackSchema]] = []

	model_config = ConfigDict(from_attributes=True)


class GroceryCreateSchema(BaseModel):
	name: str
	price: int
	quantity: int
	category_id: int
	company_id: int

	model_config = ConfigDict(from_attributes=True)


GrocerySchema.model_rebuild()
GroceryCreateSchema.model_rebuild()
GroceryCategorySchema.model_rebuild()
CompanySchema.model_rebuild()
GroceryFeedbackSchema.model_rebuild()
