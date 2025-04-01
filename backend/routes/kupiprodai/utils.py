from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.core.database.models.product import Product, ProductPicture
from backend.routes.kupiprodai.schemas import ProductPictureSchema, ProductSchema, ProductCategorySchema
from backend.common.utils import add_meilisearch_data, search_for_meilisearch_data

async def search(session: AsyncSession, keyword: str):
    return await search_for_meilisearch_data(storage_name="products", keyword=keyword)

async def create_product_schema(id: int, name: str, description: str, price: int, userId: int, categoryId: int) -> ProductSchema:
    return ProductSchema(
        id = id,
        name = name,
        description = description,
        price = price,
        userId = userId,
        categoryId = categoryId
    )

async def create_product_category_schema(id:int, name: str) ->  ProductCategorySchema:
    return ProductCategorySchema(
        id = id,
        name = name
    )