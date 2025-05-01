from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.utils import get_media_responses
from backend.core.database.models.dormeats import (
    CanteenFeedback,
    CanteenProduct,
    CanteenReport,
    Meal,
    Ingredient,
    Canteen,
)
from backend.routes.dormeats.schemas import (
    CanteenFeedbackResponseSchema,
    CanteenProductResponseSchema,
    CanteenReportResponseSchema,
    MealResponseSchema,
    IngredientResponseSchema,
    CanteenResponseSchema,
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
        status=meal.status,
        media=media_responses,
    )


async def build_canteen_feedback_response(
    canteen_feedback: CanteenFeedback,
    session: AsyncSession,
    request: Request,
):
    return CanteenFeedbackResponseSchema(
        id=canteen_feedback.id,
        canteen_id=canteen_feedback.canteen_id,
        feedback=canteen_feedback.feedback,
        rating=canteen_feedback.rating,
    )

async def build_ingredient_response(
        ingredient: Ingredient, session: AsyncSession, request: Request
):
    return IngredientResponseSchema(
        id = ingredient.id,
        meal_id = ingredient.meal_id,
        product_id = ingredient.product_id,

    )

async def build_canteen_response(
        canteen: Canteen, session: AsyncSession, request: Request, media_section: MediaSection,
):
    media_responses = await get_media_responses(
    session=session,
    request=request,
    entity_id=canteen.id,
    media_section=media_section,
    )
    return CanteenResponseSchema(
        id = canteen.id,
        name = canteen.name, 
        description = canteen.description,
        meida = media_responses

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
