from backend.core.database.models.grocery import Grocery, GroceryCategory, Company, GroceryFeedback
from backend.routes.magnum.schemas import (
	GrocerySchema,
	GroceryCreateSchema,
	GroceryCategorySchema,
	CompanySchema,
	GroceryFeedbackSchema
)
from backend.common.utils import search_for_meilisearch_data


async def search_groceries(keyword: str):
	return await search_for_meilisearch_data(storage_name="groceries", keyword=keyword)


async def create_grocery_schema(
	id: int,
	name: str,
	price: int,
	quantity: int,
	category_id: int,
	company_id: int,
	category: GroceryCategory = None,
	company: Company = None,
	feedbacks: list[GroceryFeedback] = None
) -> GrocerySchema:
	return GrocerySchema(
		id=id,
		name=name,
		price=price,
		quantity=quantity,
		category_id=category_id,
		company_id=company_id,
		category=GroceryCategorySchema.model_validate(category) if category else None,
		company=CompanySchema.model_validate(company) if company else None,
		feedbacks=[GroceryFeedbackSchema.model_validate(f) for f in feedbacks] if feedbacks else []
	)


async def create_grocery_category_schema(id: int, name: str) -> GroceryCategorySchema:
	return GroceryCategorySchema(id=id, name=name)


async def create_company_schema(id: int, name: str) -> CompanySchema:
	return CompanySchema(id=id, name=name)


async def create_feedback_schema(
	id: int,
	rating: int,
	comment: str,
	user_id: int,
	grocery_id: int
) -> GroceryFeedbackSchema:
	return GroceryFeedbackSchema(
		id=id,
		rating=rating,
		comment=comment,
		user_id=user_id,
		grocery_id=grocery_id
	)
