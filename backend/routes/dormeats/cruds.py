import asyncio

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database.models.dormeats import (
    Canteen,
    CanteenFeedback,
    CanteenProduct,
    CanteenProductCategory,
    CanteenReport,
    Ingredient,
    Meal,
)
from backend.routes.google_bucket.schemas import MediaSection

# Requests + Responses
from .schemas import (
    CanteenFeedbackRequestSchema,
    CanteenFeedbackResponseSchema,
    CanteenProductRequestSchema,
    CanteenProductResponseSchema,
    CanteenReportRequestSchema,
    CanteenReportResponseSchema,
    CanteenRequestSchema,
    CanteenResponseSchema,
    IngredientRequestSchema,
    IngredientResponseSchema,
    MealRequestSchema,
    MealResponseSchema,
)
from .utils import (
    build_canteen_feedback_response,
    build_canteen_product_response,
    build_canteen_report_response,
    build_canteen_response,
    build_ingredient_response,
    build_meal_response,
)


# create read update delete
# add get update delete
async def add_new_canteenproduct_to_db(
    session: AsyncSession,
    request: Request,
    product_data: CanteenProductRequestSchema,
    media_section: MediaSection = MediaSection.de,
) -> CanteenProductResponseSchema:
    new_canteenproduct = CanteenProduct(**product_data.dict())
    session.add(new_canteenproduct)
    await session.commit()
    await session.refresh(new_canteenproduct)

    return await build_canteen_product_response(
        canteen_product=new_canteenproduct,
        session=session,
        request=request,
        media_section=media_section,
    )


# front: scales like in small veggies section
async def filter_canteenproducts_from_db(
    session: AsyncSession, category: CanteenProductCategory
):
    pass


# ibra: canteenproduct; ingredient; meal
async def add_new_meal_to_db(
    session: AsyncSession,
    request: Request,
    meal_data: MealRequestSchema,
    media_section: MediaSection = MediaSection.de,
) -> MealResponseSchema:
    new_meal = Meal(**meal_data.dict())
    session.add(new_meal)
    await session.commit()
    await session.refresh(new_meal)

    return await build_meal_response(
        meal=new_meal, session=session, request=request, media_section=media_section
    )


async def add_new_canteen_feedback_to_db(
    session: AsyncSession,
    request: Request,
    canteen_feedback_data: CanteenFeedbackRequestSchema,
) -> CanteenFeedbackResponseSchema:
    new_canteen_feedback = CanteenFeedback(**canteen_feedback_data.dict())
    session.add(new_canteen_feedback)
    await session.commit()
    await session.refresh(new_canteen_feedback)

    return await build_canteen_feedback_response(
        canteen_feedback=new_canteen_feedback, session=session, request=request
    )


async def add_new_ingredient_to_db(
    session: AsyncSession,
    request: Request,
    ingredient_data: IngredientRequestSchema,
) -> IngredientResponseSchema:
    new_ingredient = Ingredient(**ingredient_data.dict())
    session.add(new_ingredient)
    await session.commit()
    await session.refresh(new_ingredient)

    return await build_ingredient_response(
        ingredient=new_ingredient, session=session, request=request
    )


async def add_new_canteen_to_db(
    session: AsyncSession,
    request: Request,
    canteen_data: CanteenRequestSchema,
    media_section: MediaSection = MediaSection.de,
) -> CanteenResponseSchema:
    new_canteen = Canteen(**canteen_data.dict())
    session.add(new_canteen)
    await session.commit()
    await session.refresh(new_canteen)

    return await build_canteen_response(
        canteen=new_canteen,
        session=session,
        request=request,
        media_section=media_section,
    )


async def add_new_canteen_report_to_db(
    session: AsyncSession,
    request: Request,
    canteen_report_data: CanteenReportRequestSchema,
    media_section: MediaSection = MediaSection.de,
) -> CanteenReportResponseSchema:
    new_canteen_report = CanteenReport(**canteen_report_data.dict())
    session.add(new_canteen_report)
    await session.commit()
    await session.refresh(new_canteen_report)

    return await build_canteen_report_response(
        canteen_report=new_canteen_report,
        session=session,
        request=request,
        media_section=media_section,
    )


async def get_canteen_products_from_db(
    category: CanteenProductCategory,
    request: Request,
    session: AsyncSession,
    media_section: MediaSection = MediaSection.canteen_product,
) -> list[CanteenProductResponseSchema]:
    result = await session.execute(
        select(CanteenProduct).filter(CanteenProduct.category == category)
    )
    canteen_products = result.scalars().all()

    products_response = await asyncio.gather(
        *(
            build_canteen_product_response(product, session, request, media_section)
            for product in canteen_products
        )
    )
    return products_response


async def get_meals_from_db(
    canteen_id: int,
    request: Request,
    session: AsyncSession,
    media_section: MediaSection = MediaSection.meals,
) -> list[MealResponseSchema]:
    result = await session.execute(select(Meal).filter(Meal.canteen_id == canteen_id))
    meals = result.scalars().all()

    meals_response = await asyncio.gather(
        *(build_meal_response(meal, session, request, media_section) for meal in meals)
    )
    return meals_response


async def get_ingredients_from_db(
    meal_id: int,
    request: Request,
    session: AsyncSession,
    media_section: MediaSection = MediaSection.canteen_product,
) -> list[CanteenProductResponseSchema]:
    result = await session.execute(
        select(Ingredient).filter(Ingredient.meal_id == meal_id)
    )
    ingredients = result.scalars().all()

    ingredients_response = await asyncio.gather(
        *(
            build_canteen_product_response(meal_id, session, request, media_section)
            for ingredient in ingredients
        )
    )
    return ingredients_response
