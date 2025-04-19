from fastapi import APIRouter, Depends, Request, HTTPException, status
from typing import Literal, Annotated

from .__init__ import *
from backend.common.dependencies import get_db_session, check_token


router = APIRouter(prefix="/dormeats", tags=['Dorm-Eats Routes'])

@router.post("/canteen_product/new", response_model=CanteenProductResponseSchema) #works
async def add_new_product(
        request: Request,
        user: Annotated[dict, Depends(check_token)],
        product_data: CanteenProductRequestSchema,
        db_session: AsyncSession = Depends(get_db_session)
):
    try:
        return await add_new_canteenproduct_to_db(session = db_session, product_data = product_data, request=request)
    except HTTPException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/meal/new", response_model=MealResponseSchema)
async def add_new_meal(
        request: Request,
        user: Annotated[dict, Depends(check_token)],
        meal_data: MealRequestSchema,
        db_session: AsyncSession = Depends(get_db_session)
):
    try:
        return await add_new_meal_to_db(session=db_session, meal_data=meal_data, request=request)
    except HTTPException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/canteen_report/new", response_model=CanteenReportResponseSchema)
async def add_new_canteen_report(
        request: Request,
        user: Annotated[dict, Depends(check_token)],
        canteen_report_data: CanteenReportRequestSchema,
        db_session: AsyncSession = Depends(get_db_session)
):
    try:
        return await add_new_canteen_report_to_db(session=db_session, canteen_report_data=canteen_report_data, request=request)
    except HTTPException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))