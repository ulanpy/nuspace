from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common import cruds as common_cruds
from backend.common.dependencies import check_tg, check_token, get_db_session
from backend.common.utils import meilisearch, response_builder
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.media import Media, MediaFormat
from backend.core.database.models.product import (
    Product,
    ProductCategory,
    ProductCondition,
    ProductStatus,
)
from backend.routes.google_bucket.schemas import MediaResponse
from backend.routes.google_bucket.utils import delete_bucket_object
from backend.routes.kupiprodai import utils

from .schemas import (
    ListProductSchema,
    ProductRequestSchema,
    ProductResponseSchema,
    ProductUpdateSchema,
)

router = APIRouter(tags=["Kupi-Prodai Routes"])


@router.post("/products", response_model=ProductResponseSchema)  # works
async def add_product(
    request: Request,
    product_data: ProductRequestSchema,
    user: Annotated[dict, Depends(check_token)],
    tg: Annotated[bool, Depends(check_tg)],
    db_session: AsyncSession = Depends(get_db_session),
) -> ProductResponseSchema:
    """
    Creates a new product under the 'Kupi-Prodai' section.

    **Requirements:**
    - The user must be authenticated (`access_token` cookie required).

    - The user must have a linked Telegram account (checked via dependency).

    **Parameters:**
    - `product_data`: JSON body containing product fields
    (name, description, price, user_sub, category, condition, etc.)

    **Returns:**
    - 'ProductResponseSchema': Created product with media .

    **Notes:**
    - If Telegram is not linked, the request will fail with 403.

    - The product is indexed in Meilisearch after creation.
    """
    if product_data.user_sub != user.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to create products for other users",
        )

    try:
        product: Product = await common_cruds.add_resource(
            session=db_session,
            model=Product,
            data=product_data,
            preload_relationships=[Product.user],
        )

    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database integrity error: {str(e.orig)}",
        )

    await meilisearch.upsert(
        request=request,
        storage_name=Product.__tablename__,
        json_values={
            "id": product.id,
            "name": product.name,
            "condition": product.condition.value,
            "status": product.status.value,
        },
    )

    conditions = [
        Media.entity_id == product.id,
        Media.entity_type == EntityType.products,
        Media.media_format == MediaFormat.carousel,
    ]

    media_objects: List[Media] = await common_cruds.get_resources(
        session=db_session, model=Media, conditions=conditions
    )

    media_responses: List[MediaResponse] = await response_builder.build_media_responses(
        request=request, media_objects=media_objects
    )

    return await utils.build_product_response(product=product, media_responses=media_responses)


@router.get("/products", response_model=ListProductSchema)  # works
async def get_products(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    size: int = Query(20, ge=1, le=100),
    page: int = 1,
    category: ProductCategory | None = None,
    condition: ProductCondition | None = None,
    owner_id: str | None = None,
    keyword: str | None = None,
    db_session: AsyncSession = Depends(get_db_session),
) -> ListProductSchema:
    """
    Retrieves a paginated list of products with flexible filtering.

    **Parameters:**
    - `size`: Number of products per page (default: 20)
    - `page`: Page number (default: 1)
    - `category`: Filter by product category (optional)
    - `condition`: Filter by product condition (optional)
    - `owner_id`: Filter by product owner (optional)
        - If set to "me", returns the current user's products
        - If set to a specific user_sub, returns that user's products (if authorized)
    - `keyword`: Search keyword for product name (optional)

    **Returns:**
    - List of products matching the criteria with pagination info

    **Notes:**
    - When owner_id is not specified, returns only active products
    - When owner_id="me", returns all user's products (active and inactive)
    """
    try:
        conditions = []
        user_sub = None
        include_inactive = False

        if owner_id:
            if owner_id == "me":
                user_sub = user.get("sub")
                include_inactive = True
            else:
                # Optional: Add authorization check here if needed
                user_sub = owner_id

        if keyword:
            meili_result = await meilisearch.get(
                request=request,
                storage_name=EntityType.products.value,
                keyword=keyword,
                page=page,
                size=size,  # limit max returned IDs, adjust as needed
                filters=(
                    [f"status = {ProductStatus.active.value}"] if not include_inactive else None
                ),
            )
            product_ids = [item["id"] for item in meili_result["hits"]]

            if not product_ids:
                return ListProductSchema(products=[], num_of_pages=1)

            count = meili_result.get("estimatedTotalHits", 0)

        else:
            count = await common_cruds.get_resource_count(
                model=Product, session=db_session, conditions=conditions
            )

        # SQLAlchemy conditions
        if not include_inactive:
            conditions.append(Product.status == ProductStatus.active)
        if category:
            conditions.append(Product.category == category)
        if condition:
            conditions.append(Product.condition == condition)
        if user_sub:
            conditions.append(Product.user_sub == user_sub)
        if keyword:
            conditions.append(Product.id.in_(product_ids))

        # Fetch products from the database with conditions
        products: List[Product | None] = await common_cruds.get_resources(
            session=db_session,
            model=Product,
            conditions=conditions,
            size=size if not keyword else None,  # Disable pagination if keyword is used
            page=page if not keyword else None,
            order_by=[Product.created_at.desc()],  # Order by newest first
            preload_relationships=[Product.user],  # Preload user relationship for response building
        )

        # Build Pydantic response
        products_responses = await response_builder.build_responses(
            request=request,
            items=products,
            session=db_session,
            media_format=MediaFormat.carousel,
            entity_type=EntityType.products,
            response_builder=utils.build_product_response,
        )

        num_of_pages = response_builder.calculate_pages(count=count, size=size)
        return ListProductSchema(products=products_responses, num_of_pages=num_of_pages)

    except HTTPException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.patch("/products", response_model=ProductResponseSchema)
async def update_product(
    request: Request,
    new_data: ProductUpdateSchema,
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
) -> ProductResponseSchema:
    """
    Updates fields of an existing product owned by the authenticated user.

    **Requirements:**
    - The user must be authenticated (`access_token` cookie required).
    - Only the product owner can update their product.

    **Parameters:**
    - `product_id`: ID of the product to update
    - `new_data`: Updated product data including name, description, price, etc.

    **Returns:**
    - Updated product with all its details and media

    **Errors:**
    - Returns 404 if product is not found or doesn't belong to the user
    """
    conditions = [Product.user_sub == user.get("sub")]
    product: Product | None = await common_cruds.get_resource_by_id(
        session=db_session,
        model=Product,
        resource_id=new_data.product_id,
        conditions=conditions,
        preload_relationships=[Product.user],
    )

    if product is None:
        raise HTTPException(status_code=404, detail="Product not found or doesn't belong to you")

    # Update product in database first
    updated_product: Product | None = await common_cruds.update_resource(
        session=db_session, resource=product, update_data=new_data
    )

    # Single Meilisearch update with all fields
    await meilisearch.upsert(
        request=request,
        storage_name=Product.__tablename__,
        json_values={
            "id": updated_product.id,
            "name": updated_product.name,
            "condition": updated_product.condition.value,
            "status": updated_product.status.value,
        },
    )

    # Get associated media
    conditions = [
        Media.entity_id == updated_product.id,
        Media.entity_type == EntityType.products,
        Media.media_format == MediaFormat.carousel,
    ]

    media_objects: List[Media] = await common_cruds.get_resources(
        session=db_session, model=Media, conditions=conditions, preload_relationships=[]
    )

    media_responses: List[MediaResponse] = await response_builder.build_media_responses(
        request=request, media_objects=media_objects
    )

    return await utils.build_product_response(
        product=updated_product, media_responses=media_responses
    )


@router.get("/products/{product_id}", response_model=ProductResponseSchema)  # works
async def get_product_by_id(
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

    conditions = [Product.status == ProductStatus.active]

    product = await common_cruds.get_resource_by_id(
        session=db_session,
        model=Product,
        resource_id=product_id,
        conditions=conditions,
        preload_relationships=[Product.user],
    )

    if product is None:
        raise HTTPException(status_code=404, detail="Active product not found")

    conditions = [
        Media.entity_id == product.id,
        Media.entity_type == EntityType.products,
        Media.media_format == MediaFormat.carousel,
    ]

    media_objects: List[Media] = await common_cruds.get_resources(
        session=db_session, model=Media, conditions=conditions, preload_relationships=[]
    )

    media_responses: List[MediaResponse] = await response_builder.build_media_responses(
        request=request, media_objects=media_objects
    )
    return await utils.build_product_response(product=product, media_responses=media_responses)


@router.delete("/products/{product_id}")  # works
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
    - Returns 404 if the product is not found or doesn't belong to the user.
    - Returns 500 on internal error.
    """
    try:

        product_conditions = [Product.id == product_id, Product.user_sub == user.get("sub")]

        product: Product | None = await common_cruds.get_resource_by_id(
            session=db_session,
            model=Product,
            resource_id=product_id,
            conditions=product_conditions,
            preload_relationships=[Product.user],
        )

        if product is None:
            raise HTTPException(
                status_code=404, detail="Product not found or doesn't belong to you"
            )

        media_conditions = [Media.entity_id == product.id, Media.entity_type == EntityType.products]

        media_objects: List[Media] = await common_cruds.get_resources(
            session=db_session, model=Media, conditions=media_conditions, preload_relationships=[]
        )

        if media_objects:
            for media in media_objects:
                await delete_bucket_object(request, media.name)

        product_deleted = await common_cruds.delete_resource(session=db_session, resource=product)

        media_deleted = await common_cruds.delete_resource(
            session=db_session, resource=media_objects
        )

        if not product_deleted or not media_deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found or doesn't belong to you",
            )

        await meilisearch.delete(
            request=request, storage_name=Product.__tablename__, primary_key=str(product_id)
        )
        return status.HTTP_204_NO_CONTENT

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
