from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import check_tg, check_token, get_db_session
from backend.common.utils import search_for_meilisearch_data

from ...core.configs.config import config
from ...rbq.producer import send_notification
from ...rbq.schemas import Notification
from .cruds import (
    ProductCategory,
    ProductCondition,
    add_new_product_feedback_to_db,
    add_new_product_to_db,
    add_product_report,
    get_product_feedbacks_from_db,
    get_product_from_db,
    get_products_of_user_from_db,
    remove_product_feedback_from_db,
    remove_product_from_db,
    show_products_for_search,
    show_products_from_db,
    update_product_in_db,
)
from .schemas import (
    ListProductFeedbackResponseSchema,
    ListResponseSchema,
    ProductFeedbackResponseSchema,
    ProductFeedbackSchema,
    ProductReportResponseSchema,
    ProductReportSchema,
    ProductRequestSchema,
    ProductResponseSchema,
    ProductUpdateResponseSchema,
    ProductUpdateSchema,
)

router = APIRouter(prefix="/products", tags=["Kupi-Prodai Routes"])


@router.post("/new", response_model=ProductResponseSchema)  # works
async def add_new_product(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    tg: Annotated[bool, Depends(check_tg)],
    product_data: ProductRequestSchema,
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Creates a new product under the 'Kupi-Prodai' section.

    **Requirements:**
    - The user must be authenticated (`access_token` cookie required).

    - The user must have a linked Telegram account (checked via dependency).

    **Parameters:**
    - `product_data`: JSON body containing product fields
    (name, description, price, category, condition, etc.)

    - Automatically associates the product with the authenticated user.

    **Returns:**
    - The newly created product with full details including associated media (if any).

    **Notes:**
    - If Telegram is not linked, the request will fail with 403.

    - The product is indexed in Meilisearch after creation.
    """

    try:
        new_product = await add_new_product_to_db(
            db_session, product_data, user_sub=user["sub"], request=request
        )
        return new_product
    except HTTPException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/user", response_model=List[ProductResponseSchema])  # works # todo add pagination
async def get_products_of_user(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Retrieves a list of all products created by the currently authenticated user,
    including both active and inactive items.
    Results are ordered by most recently updated.

    **Parameters:**

    - `access_token`: Required authentication token from cookies (via dependency).

    **Returns:**
    - A list of the user's own products, each with full
    product details and associated media.

    **Notes:**
    - Pagination is not yet implemented (all products are returned at once).

    - Only products belonging to the authenticated user are included.
    """
    user_sub = user.get("sub")
    try:
        return await get_products_of_user_from_db(
            request=request, user_sub=user_sub, session=db_session
        )
    except HTTPException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=e)


@router.get("/list", response_model=ListResponseSchema)  # works
async def get_products(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
    size: int = 20,
    page: int = 1,
    category: ProductCategory = None,
    condition: ProductCondition = None,
):
    """
    Retrieves a paginated list of active products, with optional filtering
    by category and condition.

    **Parameters:**

    - `size`: Number of products per page (default: 20)

    - `page`: Page number (default: 1)

    - `category`: Filter by product category (optional)

    - `condition`: Filter by product condition (optional)

    **Returns:**
    - A list of active products, sorted by most recently updated.
    """

    return await show_products_from_db(
        request=request,
        session=db_session,
        size=size,
        page=page,
        category=category,
        condition=condition,
    )


@router.get("/{product_id}", response_model=ProductResponseSchema)  # works
async def get_product(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    product_id: int,
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Retrieves a single active product by its unique ID, including
    its associated media files.

    **Parameters:**

    - `product_id`: The unique identifier of the product to retrieve.

    - `access_token`: Required authentication token from cookies (via dependency).

    **Returns:**
    - A detailed product object if found, including its name, description,
    price, category, condition, and media URLs.

    **Errors:**
    - Returns `404 Not Found` if the product with the specified ID
    does not exist or is inactive.

    - Returns `401 Unauthorized` if no valid access token is provided.
    """

    product = await get_product_from_db(request=request, product_id=product_id, session=db_session)

    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    return product


@router.delete("/{product_id}")  # works
async def remove_product(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    product_id: int,
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Deletes a specific product owned by the authenticated user.

    **Requirements:**
    - The user must be authenticated (`access_token` cookie required).

    - Only the owner of the product can delete it.

    **Parameters:**
    - `product_id`: The ID of the product to delete.

    **Process:**
    - Deletes the product entry from the database.
    - Deletes all related media files from the storage bucket and their DB records.
    - Removes the product from the Meilisearch index.

    **Returns:**
    - HTTP 204 No Content on successful deletion.

    **Errors:**
    - Returns 403 if the product does not belong to the user.
    - Returns 404 if the product is not found.
    - Returns 500 on internal error.
    """

    try:
        await remove_product_from_db(
            request=request,
            user_sub=user.get("sub"),
            product_id=product_id,
            session=db_session,
        )
        return status.HTTP_204_NO_CONTENT

    except HTTPException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.patch("/", response_model=ProductUpdateResponseSchema)  # works
async def update_product(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    product_update: ProductUpdateSchema,
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Updates fields of an existing product owned by the authenticated user.

    **Requirements:**
    - The user must be authenticated (`access_token` cookie required).

    - Only the product owner can update their product.

    **Parameters:**
    - `product_id`: ID of the product to update (included in the request body).

    - `name`, `description`, `price`, `category`, `condition`, `status` —
    any of these fields can be updated individually or together.

    **Process:**
    - Validates that the product exists and belongs to the user.
    - Applies only the provided (non-null) updates.
    - Updates Meilisearch index if the name changes.

    **Returns:**
    - A dictionary with the `product_id` and the updated fields.

    **Errors:**
    - Returns 404 if the product does not exist or doesn't belong to the user.
    - Returns 500 on internal error.
    """

    product_update = await update_product_in_db(
        request=request,
        product_update=product_update,
        user_sub=user.get("sub"),
        session=db_session,
    )
    return {
        "product_id": product_update.product_id,
        "updated_fields": product_update.dict(exclude_unset=True),
    }


@router.get("/search/", response_model=ListResponseSchema)
async def search(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    keyword: str,
    condition: ProductCondition = None,
    size: int = 20,
    page: int = 1,
    db_session=Depends(get_db_session),
):
    """
    Retrieves product objects from database based on the
    search result of pre_search router.
    - The returned products contain details such as id, name,
    description, price, condition, and category.

    **Parameters:**
    - `keyword`: word for searching products
    - `size`: Number of products per page (default: 20)
    - `page`: Page number (default: 1)

    **Returns:**
    - A list of product objects that match the keyword from the search.
    - Products will be returned with their full details (from the database).
    """
    if condition:
        filters=[f"condition = {condition.value}"]
    else:
        filters = None
    search_results = await search_for_meilisearch_data(
        keyword=keyword,
        request=request,
        page=page,
        size=size,
        filters=filters,
        storage_name="products",
    )
    product_ids = [product["id"] for product in search_results["hits"]]
    return await show_products_for_search(
        size=size,
        request=request,
        session=db_session,
        product_ids=product_ids,
        num_of_products=search_results["estimatedTotalHits"],
    )


@router.get("/pre_search/", response_model=list[str])
async def pre_search(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    keyword: str,
    db_session=Depends(get_db_session),
):
    """
    Searches for products based on the provided keyword:
    - Uses Meilisearch to find matching products.
    - Will return active products only that match the keyword.
    - The search results are then used to fetch product details from the database.
    - The returned products contain details such as id, name,
    description, price, condition, and category.

    **Parameters:**
    - `keyword`: The search term used to find products.
    It will be used for querying in Meilisearch.

    **Returns:**
    - A list of product objects that match the keyword from the search.
    """
    distinct_keywords = []
    seen = set()
    page = 1
    while len(distinct_keywords) < 5:
        result = await search_for_meilisearch_data(
            request=request,
            storage_name="products",
            keyword=keyword,
            page=page,
            size=20,
        )
        for object in result["hits"]:
            if object["name"] not in seen:
                seen.add(object["name"])
                distinct_keywords.append(object["name"])
            if len(distinct_keywords) >= 5:
                break
        else:
            break
        page += 1
    return distinct_keywords


@router.post(
    "/feedback/{product_id}", response_model=ProductFeedbackResponseSchema
)  # added description
async def store_new_product_feedback(
    feedback_data: ProductFeedbackSchema,
    user: Annotated[dict, Depends(check_token)],
    request: Request,
    db_session=Depends(get_db_session),
):
    """
    Adds new feedback to the product

    ***Parameters:***
    - `feedback_data`: json object with values for product_id and text of the feedback.

    ***Returns:***
    - The newly added product feedback with all of its values;

    ***Errors:***
    - Returns 500 on internal error.
    """

    try:
        product = await get_product_from_db(
            request=request, product_id=feedback_data.product_id, session=db_session
        )
        key_exist: bool = await request.app.state.redis.exists(
            f"notification:{product.user_telegram_id}"
        )
        if not key_exist:
            await send_notification(
                channel=request.app.state.rbq_channel,
                notification=Notification(
                    user_id=product.user_telegram_id,
                    text=feedback_data.text,
                    url=f"https://{config.ROUTING_PREFIX}/apps/kupi-prodai/product/{feedback_data.product_id}",
                ),
            )
        return await add_new_product_feedback_to_db(
            feedback_data=feedback_data, user_sub=user.get("sub"), session=db_session
        )
    except HTTPException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get(
    "/feedback/{product_id}", response_model=ListProductFeedbackResponseSchema
)  # added description
async def get_product_feedbacks(
    product_id: int,
    user: Annotated[dict, Depends(check_token)],
    db_session=Depends(get_db_session),
    size: int = 20,
    page: int = 1,
):
    """
    Retrieves a paginated list of feedbacks of the product.

    **Parameters:**

    - `size`: Number of products per page (default: 20)

    - `page`: Page number (default: 1)

    - `product_id`: ID of the product

    **Returns:**
    - A list of feedbacks of the product, sorted by most recently added.
    """
    return await get_product_feedbacks_from_db(
        product_id=product_id, session=db_session, size=size, page=page
    )


@router.delete("/feedback/{feedback_id}")  # added description
async def remove_product_feedback(
    feedback_id: int,
    user: Annotated[dict, Depends(check_token)],
    db_session=Depends(get_db_session),
):
    """
    Deletes a specific product feedback added by the authenticated user.

    **Requirements:**
    - The user must be authenticated (`access_token` cookie required).

    - Only the owner of the product feedback can delete it.

    **Parameters:**
    - `feedback_id`: The ID of the product feedback to delete.

    **Process:**
    - Deletes the product feedback from the database.

    **Returns:**
    - HTTP 204 No Content on successful deletion.

    **Errors:**
    - Returns 403 if the product does not belong to the user.
    - Returns 404 if the product is not found.
    - Returns 500 on internal error.
    """
    try:
        await remove_product_feedback_from_db(
            feedback_id=feedback_id, user_sub=user.get("sub"), session=db_session
        )
        return status.HTTP_204_NO_CONTENT
    except HTTPException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post(
    "/{product_id}/report", response_model=ProductReportResponseSchema
)  # added description
async def store_new_product_report(
    report_data: ProductReportSchema,
    user: Annotated[dict, Depends(check_token)],
    request: Request,
    db_session=Depends(get_db_session),
):
    """
    Adds a new product report.

    ***Requirements:***
    - The user must be authenticated (`access_token` cookie required).

    ***Parameters:***
    - `report_data`: JSON body containing product fields (product_id, text)

    - Automatically associates the product report with the authenticated user.

    ***Returns:***
    - The newly created product report with full details including associated
    media (if any).

    ***Errors:***
    - Returns 500 on internal error.
    """

    try:
        return await add_product_report(
            report_data=report_data, user_sub=user.get("sub"), session=db_session
        )
    except HTTPException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
