from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import (
    check_tg,
    get_creds_or_401,
    get_creds_or_guest,
    get_db_session,
    get_infra,
)
from backend.common.schemas import Infra, MediaResponse, ShortUserResponse
from backend.common.utils import meilisearch, response_builder
from backend.common.utils.enums import ResourceAction
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.media import Media, MediaFormat
from backend.core.database.models.product import (
    Product,
    ProductCategory,
    ProductCondition,
    ProductStatus,
)
from backend.core.database.models.user import User
from backend.modules.google_bucket.utils import delete_bucket_object
from backend.modules.kupiprodai import dependencies as deps
from backend.modules.kupiprodai import schemas, utils
from backend.modules.kupiprodai.policy import ProductPolicy

router = APIRouter(tags=["Kupi-Prodai Routes"])


@router.post("/products", response_model=schemas.ProductResponse)
async def add_product(
    request: Request,
    product_data: schemas.ProductRequest,
    tg: Annotated[bool, Depends(check_tg)],
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
    product_user: User = Depends(deps.user_exists_or_404),
) -> schemas.ProductResponse:
    """
    Creates a new product under the 'Kupi-Prodai' section.

    **Requirements:**
    - The user must be authenticated (`access_token` cookie required).

    **Parameters:**
    - `product_data`: JSON body containing product fields
    (name, description, price, user_sub, category, condition, etc.)

    **Returns:**
    - 'ProductResponseSchema': Created product with media .

    **Notes:**
    - The product is indexed in Meilisearch after creation.
    """
    await ProductPolicy(user=user).check_permission(
        action=ResourceAction.CREATE, product_data=product_data
    )

    if product_data.user_sub == "me":
        product_data.user_sub = user[0].get("sub")

    try:
        qb = QueryBuilder(session=db_session, model=Product)
        product: Product = await qb.add(
            data=product_data,
            preload=[Product.user],
        )

    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database integrity error: {str(e.orig)}",
        )

    await meilisearch.upsert(
        client=request.app.state.meilisearch_client,
        storage_name=Product.__tablename__,
        json_values={
            "id": product.id,
            "name": product.name,
            "status": product.status.value,
            "category": product.category.value,
        },
    )

    conditions = [
        Media.entity_id == product.id,
        Media.entity_type == EntityType.products,
        Media.media_format == MediaFormat.carousel,
    ]

    media_objects: List[Media] = await qb.blank(model=Media).base().filter(*conditions).all()

    media_responses: List[MediaResponse] = await response_builder.build_media_responses(
        request=request, media_objects=media_objects
    )

    return response_builder.build_schema(
        schemas.ProductResponse,
        schemas.ProductResponse.model_validate(product),
        media=media_responses,
        user_telegram_id=product.user.telegram_id,
        seller=ShortUserResponse.model_validate(product.user),
        permissions=utils.get_product_permissions(product, user),
    )


@router.get("/products", response_model=schemas.ListProductResponse)
async def get_products(
    request: Request,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    size: int = Query(20, ge=1, le=100),
    page: int = 1,
    category: ProductCategory | None = Query(default=None),
    condition: ProductCondition | None = Query(default=None),
    infra: Infra = Depends(get_infra),
    status: ProductStatus | None = Query(
        default=None, description="Not setting this parameter returns all products"
    ),
    owner_sub: str | None = Query(
        default=None, description="If 'me', returns the current user's products"
    ),
    keyword: str | None = Query(default=None, description="Search keyword for product name"),
    db_session: AsyncSession = Depends(get_db_session),
) -> schemas.ListProductResponse:
    """
    Retrieves a paginated list of products with flexible filtering.

    **Parameters:**
    - `size`: Number of products per page (default: 20)
    - `page`: Page number (default: 1)
    - `category`: Filter by product category (optional)
    - `condition`: Filter by product condition (optional)
    - `owner_sub`: Filter by product owner (optional)
        - If set to "me", returns the current user's products
        - If set to a specific user_sub, returns that user's products
    - `keyword`: Search keyword for product name (optional)
    - `status`: Filter by product status (optional). If not specified, returns all products

    **Returns:**
    - List of products matching the criteria with pagination info
    """
    await ProductPolicy(user=user).check_permission(
        action=ResourceAction.READ, owner_sub=owner_sub, status=status
    )

    conditions = []

    # Determine guest status
    is_guest: bool = bool(user[1].get("is_guest"))

    if owner_sub == "me":
        owner_sub = user[0].get("sub")

    if keyword:
        meili_result = await meilisearch.get(
            client=request.app.state.meilisearch_client,
            storage_name=EntityType.products.value,
            keyword=keyword,
            page=page,
            size=size,
            filters=([f"status = {status.value}"] if status else None),
        )
        product_ids = [item["id"] for item in meili_result["hits"]]

        if not product_ids:
            return schemas.ListProductResponse(products=[], total_pages=1)

    # SQLAlchemy conditions
    if status:
        conditions.append(Product.status == status)
    if category:
        conditions.append(Product.category == category)
    if condition:
        conditions.append(Product.condition == condition)
    if owner_sub:
        conditions.append(Product.user_sub == owner_sub)
    if keyword:
        conditions.append(Product.id.in_(product_ids))

    # Fetch products from the database with conditions
    qb = QueryBuilder(session=db_session, model=Product)

    if keyword:
        # Preserve Meilisearch ranking order by using a custom order
        from sqlalchemy import case

        order_clause = case(
            *[(Product.id == product_id, index) for index, product_id in enumerate(product_ids)],
            else_=len(product_ids),
        )
        products: List[Product] = (
            await qb.base().filter(*conditions).eager(Product.user).order(order_clause).all()
        )
    else:
        # Default order by creation date when no keyword
        products: List[Product] = (
            await qb.base()
            .filter(*conditions)
            .eager(Product.user)
            .paginate(size, page)
            .order(Product.created_at.desc())
            .all()
        )

    media_objs: List[Media] = (
        await qb.blank(model=Media)
        .base()
        .filter(
            Media.entity_id.in_([product.id for product in products]),
            Media.entity_type == EntityType.products,
            Media.media_format == MediaFormat.carousel,
        )
        .all()
    )

    media_results: List[List[MediaResponse]] = await response_builder.map_media_to_resources(
        infra=infra, media_objects=media_objs, resources=products
    )

    if keyword:
        count = meili_result.get("estimatedTotalHits", 0)
    else:
        count: int = await qb.blank(model=Product).base(count=True).filter(*conditions).count()

    product_responses: List[schemas.ProductResponse] = []
    for product, media in zip(products, media_results):
        hide_seller = is_guest and product.status == ProductStatus.active
        product_responses.append(
            response_builder.build_schema(
                schemas.ProductResponse,
                schemas.ProductResponse.model_validate(product),
                media=media,
                seller=None if hide_seller else ShortUserResponse.model_validate(product.user),
                user_telegram_id=None if hide_seller else product.user.telegram_id,
                permissions=utils.get_product_permissions(product, user),
            )
        )

    total_pages: int = response_builder.calculate_pages(count=count, size=size)
    return schemas.ListProductResponse(products=product_responses, total_pages=total_pages)


@router.patch("/products/{product_id}", response_model=schemas.ProductResponse)
async def update_product(
    request: Request,
    product_data: schemas.ProductUpdateRequest,
    product_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
    infra: Infra = Depends(get_infra),
    product: Product = Depends(deps.product_exists_or_404),
) -> schemas.ProductResponse:
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
    await ProductPolicy(user=user).check_permission(
        action=ResourceAction.UPDATE, product=product, product_data=product_data
    )

    # Update product in database first
    qb = QueryBuilder(session=db_session, model=Product)
    updated_product: Product = await qb.update(instance=product, update_data=product_data)

    # Single Meilisearch update with all fields
    await meilisearch.upsert(
        client=request.app.state.meilisearch_client,
        storage_name=Product.__tablename__,
        json_values={
            "id": updated_product.id,
            "name": updated_product.name,
            "status": updated_product.status.value,
            "category": updated_product.category.value,
        },
    )

    media_objs: List[Media] = (
        await qb.blank(model=Media)
        .base()
        .filter(
            Media.entity_id.in_([updated_product.id]),
            Media.entity_type == EntityType.products,
            Media.media_format == MediaFormat.carousel,
        )
        .all()
    )

    media_results: List[List[MediaResponse]] = await response_builder.map_media_to_resources(
        infra=infra, media_objects=media_objs, resources=[updated_product]
    )

    return response_builder.build_schema(
        schemas.ProductResponse,
        schemas.ProductResponse.model_validate(updated_product),
        media=media_results[0],
        seller=ShortUserResponse.model_validate(updated_product.user),
        user_telegram_id=updated_product.user.telegram_id,
        permissions=utils.get_product_permissions(updated_product, user),
    )


@router.get("/products/{product_id}", response_model=schemas.ProductResponse)
async def get_product_by_id(
    request: Request,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    product_id: int,
    db_session: AsyncSession = Depends(get_db_session),
    infra: Infra = Depends(get_infra),
    product: Product = Depends(deps.product_exists_or_404),
) -> schemas.ProductResponse:
    """
    Retrieves a single active/inactive product by its unique ID, including
    its associated media files.

    **Parameters:**
    - `product_id`: The unique identifier of the product to retrieve.
    - `status`: Filter by product status (optional)
    - `access_token`: Required authentication token from cookies (via dependency).

    **Returns:**
    - A detailed product object if found, including its name, description,
    price, category, condition, and media URLs.

    **Errors:**
    - Returns `404 Not Found` if the product with the specified ID
    does not exist or is inactive.
    - Returns `401 Unauthorized` if no valid access token is provided.
    """
    await ProductPolicy(user=user).check_permission(
        action=ResourceAction.READ,
        owner_sub=product.user_sub,
        product=product,
    )

    conditions = [
        Media.entity_id == product.id,
        Media.entity_type == EntityType.products,
        Media.media_format == MediaFormat.carousel,
    ]

    qb = QueryBuilder(session=db_session, model=Media)
    media_objs: List[Media] = await qb.blank(model=Media).base().filter(*conditions).all()

    media_results: List[List[MediaResponse]] = await response_builder.map_media_to_resources(
        infra=infra, media_objects=media_objs, resources=[product]
    )

    is_guest: bool = bool(user[1].get("is_guest"))
    hide_seller = is_guest and product.status == ProductStatus.active

    return response_builder.build_schema(
        schemas.ProductResponse,
        schemas.ProductResponse.model_validate(product),
        media=media_results[0],
        seller=None if hide_seller else ShortUserResponse.model_validate(product.user),
        user_telegram_id=None if hide_seller else product.user.telegram_id,
        permissions=utils.get_product_permissions(product, user),
    )


@router.delete("/products/{product_id}")
async def remove_product(
    request: Request,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    product_id: int,
    db_session: AsyncSession = Depends(get_db_session),
    infra: Infra = Depends(get_infra),
    product: Product = Depends(deps.product_exists_or_404),
):
    """
    Deletes a specific product owned by the authenticated user.

    **Requirements:**
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
    await ProductPolicy(user=user).check_permission(action=ResourceAction.DELETE, product=product)

    try:
        media_conditions = [Media.entity_id == product.id, Media.entity_type == EntityType.products]

        qb = QueryBuilder(session=db_session, model=Media)
        media_objects: List[Media] = await qb.base().filter(*media_conditions).all()

        if media_objects:
            for media in media_objects:
                await delete_bucket_object(
                    request.app.state.storage_client,
                    request.app.state.config,
                    media.name,
                )

        product_deleted: bool = await qb.blank(Product).delete(target=product)
        media_deleted: bool = await qb.blank(Media).delete(target=media_objects)

        if not product_deleted or not media_deleted:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete product or media",
            )

        await meilisearch.delete(
            client=request.app.state.meilisearch_client,
            storage_name=Product.__tablename__,
            primary_key=str(product_id),
        )
        return status.HTTP_204_NO_CONTENT

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
