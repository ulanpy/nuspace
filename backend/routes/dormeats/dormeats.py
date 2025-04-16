from fastapi import APIRouter, Depends, Request, HTTPException, status
from typing import Literal, Annotated

from .__init__ import *
from backend.common.dependencies import get_db_session, check_token, check_tg
from .cruds import *

router = APIRouter(prefix="/canteen_products", tags=['Dorm-Eats Routes'])

@router.post("/new", response_model=CanteenProductResponseSchema) #works
async def add_new_product(
        request: Request,
        user: Annotated[dict, Depends(check_token)],
        tg: Annotated[bool, Depends(check_tg)],
        canteen_data: CanteenProductRequestSchema,
        db_session: AsyncSession = Depends(get_db_session)
):
    try:
        new_canteen_product = await add_new_canteenproduct_to_db(db_session, canteen_data, request=request)
        return new_canteen_product
    except HTTPException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
