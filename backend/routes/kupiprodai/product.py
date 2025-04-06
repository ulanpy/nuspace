from fastapi import APIRouter, Depends, Request, HTTPException, status
from typing import Literal, Annotated

from .__init__ import *
from backend.common.utils import *
from backend.common.dependencies import get_db_session, check_token
from .cruds import show_products_from_db, add_new_product_to_db


router = APIRouter(prefix="/products", tags=['Kupi-Prodai Routes'])


@router.post("/new", response_model=ProductResponseSchema) #works
async def add_new_product(
        request: Request,
        user: Annotated[dict, Depends(check_token)],
        product_data: ProductRequestSchema,
        db_session: AsyncSession = Depends(get_db_session)
):
    """
    Adds a new product to the list of Kupi-Prodai products:
        - In success returns product details
    """
    try:
        new_product = await add_new_product_to_db(db_session, product_data, user_sub=user["sub"], request=request)
        return new_product
    except HTTPException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get('/user', response_model=List[ProductResponseSchema]) #works # todo add pagination
async def get_products_of_user(
        request: Request,
        user: Annotated[dict, Depends(check_token)],
        db_session: AsyncSession = Depends(get_db_session)
):
    """
    Get list of ALL user's products' (both active and inactive) ordered by latest ones first
    """
    user_sub = user.get("sub")
    try:
        return await get_products_of_user_from_db(request=request, user_sub=user_sub, session=db_session)
    except HTTPException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=e)




@router.get("/list", response_model=List[ProductResponseSchema]) #works
async def get_products(
        request: Request,
        db_session: AsyncSession = Depends(get_db_session),
        size: int = 20,
        page: int = 1,
        category: ProductCategory = None,
        condition: ProductCondition = None
):
    """
    Retrieves a paginated list of active products, with optional filtering by category and condition.

    **Parameters:**

    - `size`: Number of products per page (default: 20)

    - `page`: Page number (default: 1)

    - `category`: Filter by product category (optional)

    - `condition`: Filter by product condition (optional)

    **Returns:**
    - A list of active products, sorted by most recently updated.
    """

    return await show_products_from_db(request=request,
                                       session=db_session,
                                       size=size,
                                       page=page,
                                       category=category,
                                       condition=condition
                                       )


@router.get("/{product_id}", response_model=ProductResponseSchema) #works
async def get_product(
        request: Request,
        product_id: int,
        db_session: AsyncSession = Depends(get_db_session)
):
    product = await get_product_from_db(
        request=request,
        product_id=product_id,
        session=db_session
    )

    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    return product


@router.delete("/{product_id}")  #works
async def remove_product(
        request: Request,
        product_id: int,
        db_session: AsyncSession = Depends(get_db_session)
):
    try:
        await remove_product_from_db(
            request=request,
            product_id=product_id,
            session=db_session
        )
        return status.HTTP_204_NO_CONTENT

    except HTTPException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.patch("/{product_id}")  #works
async def update_product(
    product_update: ProductUpdateSchema,
    db_session: AsyncSession = Depends(get_db_session)
):
    product_update = await update_product_in_db(product_update=product_update, session=db_session)
    return {"product_id": product_update.product_id, "updated_fields": product_update.dict(exclude_unset=True)}



@router.get("/search/{keyword}", response_model=List[ProductResponseSchema])
async def search(
        keyword: str,
        db_session=Depends(get_db_session)
):
    """
    Searches for products based on the provided keyword:
    - Uses Meilisearch to find matching products.
    - Will return active products only that match the keyword.
    - The search results are then used to fetch product details from the database.
    - The returned products contain details such as id, name, description, price, condition, and category.

    **Parameters:**
    - `keyword`: The search term used to find products. It will be used for querying in Meilisearch.

    **Returns:**
    - A list of product objects that match the keyword from the search.
    - Products will be returned with their full details (from the database).
    """
    result = await search_for_meilisearch_data(storage_name="products", keyword=keyword)
    products = result['data']['hits']
    product_objects = []
    for product in products:
        product_objects.append(await get_product_from_db(product_id=product['id'], session=db_session))
    return product_objects


@router.post("/{product_id}/feedback")
async def store_new_product_feedback(product_id: int):
    pass


@router.get("/{product_id}/feedback")
async def get_product_feedback(product_id: int):
    pass


@router.post("/{product_id}/report")
async def store_new_product_report(product_id: int, request: Request):
    pass

