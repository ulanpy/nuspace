from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.utils import get_media_responses
from backend.core.database.models.dormeats import (
    AvailableMeal,
    CanteenProduct,
    CanteenReport,
    Meal,
    Ingredient,
)
from backend.routes.dormeats.schemas import (
    AvailableMealResponseSchema,
    CanteenProductResponseSchema,
    CanteenReportResponseSchema,
    MealResponseSchema,
    IngredientResponseSchema
)
from backend.routes.google_bucket.schemas import MediaSection


async def build_canteen_product_response(
    canteen_product: CanteenProduct,
    session: AsyncSession,
    request: Request,
    media_section: MediaSection,
):
    media_responses = await get_media_responses(
        session=session,
        request=request,
        entity_id=canteen_product.id,
        media_section=media_section,
    )
    return CanteenProductResponseSchema(
        id=canteen_product.id,
        name=canteen_product.name,
        category=canteen_product.category,
        media=media_responses,
    )


async def build_meal_response(
    meal: Meal, session: AsyncSession, request: Request, media_section: MediaSection
):
    media_responses = await get_media_responses(
        session=session, request=request, entity_id=meal.id, media_section=media_section
    )
    return MealResponseSchema(
        id=meal.id,
        name=meal.name,
        description=meal.description,
        price=meal.price,
        category=meal.category,
        media=media_responses,
    )


async def build_available_meal_response(
    available_meal: AvailableMeal, session: AsyncSession, request: Request
):
    return AvailableMealResponseSchema(
        id=available_meal.id,
        canteen_id=available_meal.canteen_id,
        meal_id=available_meal.meal_id,
        status=available_meal.status,
    )

async def build_ingredient_response(
        ingredient: Ingredient, session: AsyncSession, request: Request
):
    return IngredientResponseSchema(
        id = ingredient.id,
        meal_id = ingredient.meal_id,
        product_id = ingredient.product_id,

    )


async def build_canteen_report_response(
    canteen_report: CanteenReport,
    session: AsyncSession,
    request: Request,
    media_section: MediaSection,
):
    media_responses = await get_media_responses(
        session=session,
        request=request,
        entity_id=canteen_report.id,
        media_section=media_section,
    )
    return CanteenReportResponseSchema(
        id=canteen_report.id,
        canteen_id=canteen_report.canteen_id,
        report=canteen_report.report,
        media=media_responses,
    )
