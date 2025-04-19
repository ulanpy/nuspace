from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import Request
from backend.core.database.models.dormeats import CanteenProduct, Meal
from backend.core.database.models.media import Media
from backend.routes.dormeats.schemas import CanteenProductResponseSchema, MealResponseSchema
from typing import List
from backend.routes.google_bucket.utils import generate_download_url
from backend.routes.google_bucket.schemas import MediaResponse, MediaSection
import asyncio
from backend.common.utils import get_media_responses

async def build_canteen_product_response(
        canteen_product: CanteenProduct,
        session: AsyncSession,
        request: Request,
        media_section: MediaSection
):
    media_responses = await get_media_responses(session = session, request = request, entity_id = canteen_product.id, media_section = media_section)
    return CanteenProductResponseSchema(
        id = canteen_product.id,
        name = canteen_product.name,
        category = canteen_product.category,
        media = media_responses
    )

async def build_meal_response(
        meal: Meal,
        session: AsyncSession,
        request: Request,
        media_section: MediaSection
):
    media_responses = await get_media_responses(session=session, request=request, entity_id=meal.id, media_section=media_section)
    return MealResponseSchema(
        id = meal.id,
        name = meal.name,
        description = meal.description,
        price = meal.price, 
        category = meal.category,
        media = media_responses
    )
