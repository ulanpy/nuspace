from fastapi import APIRouter, Depends, Request, HTTPException, status
from typing import Literal, Annotated

from .__init__ import *
from backend.common.utils import *
from backend.common.dependencies import get_db_session, validate_access_token_dep
from .cruds import show_products_from_db, add__new_product_to_db


router = APIRouter(prefix="/products", tags=['Kupi-Prodai Routes'])


@router.post("/new") #works
async def add_new_product(
        request: Request,
        user: Annotated[dict, Depends(validate_access_token_dep)],
        product_data: ProductSchema,
        db_session: AsyncSession = Depends(get_db_session)
):
    """
    Adds a new product to the list of Kupi-Prodai products:
        - In success returns product details
    """
    try:
        new_product = await add__new_product_to_db(db_session, product_data, user_sub=user["sub"])
        await add_meilisearch_data(storage_name='products', json_values={'id': new_product.id, 'name': new_product.name})
        return new_product
    except HTTPException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get('/user') #works #todo add pagination
async def get_products_of_user(
        request: Request,
        user: Annotated[dict, Depends(validate_access_token_dep)],
        db_session: AsyncSession = Depends(get_db_session)
):
    """
    Get list of ALL user's products' (both active and inactive) ordered by latest ones first
    """
    user_sub = user.get("sub")
    try:
        return await get_products_of_user_from_db(user_sub=user_sub, session=db_session)
    except HTTPException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=e)




@router.get("/list") #works
async def get_products(
        request: Request,
        db_session: AsyncSession = Depends(get_db_session),
        size: int = 20,
        page: int = 1,
        category: ProductCategory = None,
        condition: ProductCondition = None
):
    """
        Gets list of active products/services:
        - Will NOT show deactivated products
    """

    return await show_products_from_db(session=db_session, size=size, page=page, category=category, condition=condition)

@router.get("/{product_id}") #works
async def get_product(
        request: Request,
        product_id: int,
        db_session: AsyncSession = Depends(get_db_session)
):
    product = await get_product_from_db(product_id=product_id, session=db_session)
    return product


@router.delete("/{product_id}") #works
async def remove_product(
        product_id: int,
        db_session: AsyncSession = Depends(get_db_session)
):
    try:
        await remove_meilisearch_data(storage_name='products', object_id=product_id)
        await remove_product_from_db(product_id=product_id, session=db_session)

        return status.HTTP_204_NO_CONTENT
    except HTTPException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.patch("/{product_id}")
async def update_product(
    product_id: int,
    product_update: ProductUpdateSchema,
    db_session: AsyncSession = Depends(get_db_session)
):
    # Update the product's status in the database
    product_update = await update_product_in_db(product_id=product_id, product_update=product_update, session=db_session)
    return {"product_id": product_id, "updated_fields": product_update.dict(exclude_unset=True)}



@router.get("/search/{keyword}") #works
async def search(
        keyword: str,
        request: Request,
        db_session = Depends(get_db_session)
):
    result = await search_for_meilisearch_data(storage_name="products", keyword=keyword)
    products = result['data']['hits']
    product_objects = []
    for product in products:
        product_objects.append(await get_product_from_db(product_id=product['id'], session=db_session))
    return product_objects

@router.get("/product-pictures")
async def retrieve_product_pictures():
    pass


@router.delete('/{product_id}/pictures')
async def remove_pictures(product_id: int):
    pass


@router.post("/{product_id}/feedback")
async def store_new_product_feedback(product_id: int):
    pass


@router.get("/{product_id}/feedback")
async def get_product_feedback(product_id: int):
    pass


@router.post("/{product_id}/report")
async def store_new_product_report(product_id: int, request: Request):
    pass

