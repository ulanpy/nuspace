from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, Request
from backend.core.database.models.product import Product, ProductCategory
from backend.core.database.models.media import Media
from backend.core.database.models.product import ProductCondition, ProductCategory
from backend.routes.kupiprodai.schemas import ProductResponseSchema, ProductUpdateSchema, ProductRequestSchema, ListResponseSchema
from backend.common.utils import add_meilisearch_data,remove_meilisearch_data
from typing import Literal, List
from backend.core.database.models.product import ProductStatus
from backend.common.utils import update_meilisearch_data
from backend.routes.google_bucket.utils import generate_download_url, delete_bucket_object
from backend.routes.google_bucket.schemas import MediaResponse, MediaSection
from sqlalchemy.orm import selectinload
from .utils import build_product_response
import asyncio
from .schemas import *
from backend.core.database.models.dormeats import *

# create read update delete
# add get update delete
async def add_new_canteenproduct_to_db(
        session: AsyncSession, 
        request: Request, 
        product_data: CanteenProductSchema
): 
    new_canteenproduct = CanteenProduct(**product_data.dict())
    session.add(new_canteenproduct)
    await session.commit()
    await session.refresh(new_canteenproduct)

    # does this model need search function
    return new_canteenproduct


# front: scales like in small veggies section
async def filter_canteenproducts_from_db(
        session: AsyncSession,
        category: CanteenProductCategory
):
        pass