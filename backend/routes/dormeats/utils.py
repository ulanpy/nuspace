from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.utils import get_media_responses
from backend.core.database.models.dormeats import (
    Canteen,
    CanteenFeedback,
    CanteenProduct,
    CanteenReport,
    Ingredient,
    Meal,
)
from backend.routes.dormeats.schemas import (
    CanteenFeedbackResponseSchema,
    CanteenProductResponseSchema,
    CanteenReportResponseSchema,
    CanteenResponseSchema,
    IngredientResponseSchema,
    MealResponseSchema,
)
from backend.routes.google_bucket.schemas import MediaTable


async def build_canteen_product_response(
    canteen_product: CanteenProduct,
    session: AsyncSession,
    request: Request,
    media_table: MediaTable = MediaTable.canteen_product,
):
    media_responses = await get_media_responses(
        session=session,
        request=request,
        entity_id=canteen_product.id,
        media_table=media_table,
    )
    return CanteenProductResponseSchema(
        id=canteen_product.id,
        name=canteen_product.name,
        category=canteen_product.category,
        media=media_responses,
    )


async def build_meal_response(
    meal: Meal, session: AsyncSession, request: Request, media_table: MediaTable
) -> MealResponseSchema:
    media_responses = await get_media_responses(
        session=session, request=request, entity_id=meal.id, media_table=media_table
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
    media_table: MediaTable,
):
    return CanteenFeedbackResponseSchema(
        id=canteen_feedback.id,
        canteen_id=canteen_feedback.canteen_id,
        feedback=canteen_feedback.feedback,
        rating=canteen_feedback.rating,
    )


async def build_ingredient_response(
    ingredient: Ingredient,
    session: AsyncSession,
    request: Request
):
    return IngredientResponseSchema(
        id=ingredient.id,
        meal_id=ingredient.meal_id,
        product_id=ingredient.product_id,
    )


async def build_canteen_response(
    canteen: Canteen,
    session: AsyncSession,
    request: Request,
    media_table: MediaTable = MediaTable.canteen,
):
    media_responses = await get_media_responses(
        session=session,
        request=request,
        entity_id=canteen.id,
        media_table=media_table,
    )
    return CanteenResponseSchema(
        id=canteen.id,
        name=canteen.name,
        description=canteen.description,
        meida=media_responses
    )


async def build_canteen_report_response(
    canteen_report: CanteenReport,
    session: AsyncSession,
    request: Request,
    media_table: MediaTable,
):
    media_responses = await get_media_responses(
        session=session,
        request=request,
        entity_id=canteen_report.id,
        media_table=media_table,
    )
    return CanteenReportResponseSchema(
        id=canteen_report.id,
        canteen_id=canteen_report.canteen_id,
        report=canteen_report.report,
        media=media_responses,
    )
