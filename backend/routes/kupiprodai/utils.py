from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.core.database.models.product import Product
from backend.routes.kupiprodai.schemas import ProductSchema, ProductCategorySchema
from backend.common.utils import add_meilisearch_data, search_for_meilisearch_data

async def search(session: AsyncSession, keyword: str):
    return await search_for_meilisearch_data(storage_name="products", keyword=keyword)
