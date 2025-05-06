from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status

from backend.common.dependencies import check_token, get_db_session

from .__init__ import *

router = APIRouter(prefix="/dormeats", tags=["Dorm-Eats Routes"])


@router.post(
    "/canteen_product/new", response_model=CanteenProductResponseSchema
)  # works
async def add_new_product(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    product_data: CanteenProductRequestSchema,
    db_session: AsyncSession = Depends(get_db_session),
):
    try:
        return await add_new_canteenproduct_to_db(
            session=db_session, product_data=product_data, request=request
        )
    except HTTPException as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/meal/new", response_model=MealResponseSchema)
async def add_new_meal(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    meal_data: MealRequestSchema,
    db_session: AsyncSession = Depends(get_db_session),
):
    try:
        return await add_new_meal_to_db(
            session=db_session, meal_data=meal_data, request=request
        )
    except HTTPException as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/canteen_feedback/new", response_model=CanteenFeedbackResponseSchema)
async def add_new_canteen_feedback(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    canteen_feedback_data: CanteenFeedbackRequestSchema,
    db_session: AsyncSession = Depends(get_db_session),
):
    try:
        return await add_new_canteen_feedback_to_db(
            session=db_session,
            canteen_feedback_data=canteen_feedback_data,
            request=request,
        )
    except HTTPException as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/ingredient/new", response_model=IngredientResponseSchema)
async def add_new_ingredient(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    ingredient_data: IngredientRequestSchema,
    db_session: AsyncSession = Depends(get_db_session),
):
    try:
        return await add_new_ingredient_to_db(
            session=db_session, ingredient_data=ingredient_data, request=request
        )
    except HTTPException as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/canteen/new", response_model=CanteenResponseSchema)
async def add_new_canteen(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    canteen_data: CanteenRequestSchema,
    db_session: AsyncSession = Depends(get_db_session),
):
    try:
        return await add_new_canteen_to_db(
            session=db_session, canteen_data=canteen_data, request=request
        )
    except HTTPException as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/canteen_report/new", response_model=CanteenReportResponseSchema)
async def add_new_canteen_report(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    canteen_report_data: CanteenReportRequestSchema,
    db_session: AsyncSession = Depends(get_db_session),
):
    try:
        return await add_new_canteen_report_to_db(
            session=db_session, canteen_report_data=canteen_report_data, request=request
        )
    except HTTPException as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/canteen_products", response_model=List[CanteenProductResponseSchema])
async def get_canteen_products(
    request: Request,
    category: CanteenProductCategory,
    db_session: AsyncSession = Depends(get_db_session),
):
    try:
        return await get_canteen_products_from_db(
            request=request, category=category, session=db_session
        )
    except HTTPException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=e)

@router.get("/canteens", response_model=List[CanteenResponseSchema])
async def get_canteens(
    request: Request,
    db_session: AsyncSession = Depends(get_db_session),
):
    try: 
        return await get_canteens_from_db(
            request=request, session=db_session
        )
    except HTTPException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=e)    

@router.get('/meals', response_model=List[MealResponseSchema])
async def get_meals(
    request: Request,
    canteen_id: int,
    db_session: AsyncSession = Depends(get_db_session),
):
    try:
        return await get_meals_from_db(
            request=request, canteen_id=canteen_id, session=db_session
        )
    except HTTPException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=e)


@router.get("/ingredients", response_model=List[CanteenProductResponseSchema])
async def get_ingredients(
    request: Request, meal_id: int, db_session: AsyncSession = Depends(get_db_session)
):
    try:
        return await get_ingredients_from_db(
            request=request, meal_id=meal_id, session=db_session
        )
    except HTTPException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=e)

@router.get("/list", response_model=CanteenReportResponseSchema)  
async def get_reports_router(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
    size: int = 20,
    page: int = 1
):
    return await get_reports_(
        request=request,
        session=db_session,
        size=size,
        page=page
    )