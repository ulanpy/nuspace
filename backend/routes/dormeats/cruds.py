import asyncio

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database.models.dormeats import (
    AvailableMeal,
    CanteenProduct,
    CanteenProductCategory,
    CanteenReport,
    Meal,
)
from backend.routes.google_bucket.schemas import MediaSection

# from .schemas import CanteenProductRequestSchema, CanteenProductResponseSchema, MealRequestSchema, MealResponseSchema, CanteenReportRequestSchema, CanteenReportResponseSchema, AvailableMealRequestSchema, AvailableMealResponseSchema
# Requests
# Responses
from .schemas import (
    AvailableMealRequestSchema,
    AvailableMealResponseSchema,
    CanteenProductRequestSchema,
    CanteenProductResponseSchema,
    CanteenReportRequestSchema,
    CanteenReportResponseSchema,
    MealRequestSchema,
    MealResponseSchema,
)
from .utils import (
    build_available_meal_response,
    build_canteen_product_response,
    build_canteen_report_response,
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


async def add_new_available_meal_to_db(
    session: AsyncSession,
    request: Request,
    avaiable_meal_data: AvailableMealRequestSchema,
) -> AvailableMealResponseSchema:
    new_available_meal = AvailableMeal(**avaiable_meal_data.dict())
    session.add(new_available_meal)
    await session.commit()
    await session.refresh(new_available_meal)

    return await build_available_meal_response(
        available_meal=new_available_meal, session=session, request=request
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
    media_section: MediaSection = MediaSection.de,
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
