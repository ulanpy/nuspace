from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, Request
from backend.core.database.models.product import Product, ProductCategory
from backend.core.database.models.media import Media
from backend.core.database.models.product import ProductCondition, ProductCategory
from backend.routes.kupiprodai.schemas import ProductResponseSchema, ProductUpdateSchema, ProductRequestSchema, ListResponseSchema
from backend.common.utils import add_meilisearch_data,remove_meilisearch_data
from typing import Literal, List
from backend.core.database.models.product import ProductStatus
from backend.common.utils import update_meilisearch_data
from backend.routes.google_bucket.utils import generate_download_url, delete_bucket_object
from backend.routes.google_bucket.schemas import MediaResponse, MediaSection
from sqlalchemy.orm import selectinload

async def add_new_product_to_db(
        session: AsyncSession,
        product_data: ProductRequestSchema,
        user_sub: str,
        request: Request,
        media_section: MediaSection = MediaSection.kp

) -> ProductResponseSchema:
    new_product = Product(**product_data.dict(), user_sub=user_sub)
    session.add(new_product)
    await session.commit()
    await session.refresh(new_product)

    # Eagerly load the related user for the new product
    query = select(Product).options(selectinload(Product.user)).filter(Product.id == new_product.id)
    result = await session.execute(query)
    new_product = result.scalars().first()

    await add_meilisearch_data(storage_name='products', json_values={'id': new_product.id, 'name': new_product.name})
    media_result = await session.execute(
        select(Media).filter(Media.entity_id == new_product.id,
                             Media.section == media_section)
    )
    media_objects = media_result.scalars().all()
    media_responses = []
    for media in media_objects:
        url_data = await generate_download_url(request, media.name)
        media_responses.append(MediaResponse(
            id=media.id,
            url=url_data["signed_url"],
            mime_type=media.mime_type,
            section=media.section,
            entity_id=media.entity_id,
            media_purpose=media.media_purpose,
            media_order=media.media_order
        ))
    return ProductResponseSchema(
            id=new_product.id,
            name=new_product.name,
            description=new_product.description,
            user_name=new_product.user.name,
            user_surname=new_product.user.surname,
            price=new_product.price,
            category=new_product.category,
            condition=new_product.condition,
            status=new_product.status,
            updated_at=new_product.updated_at,
            created_at=new_product.created_at,
            media=media_responses

        )

async def get_products_of_user_from_db(
    user_sub: str,
    session: AsyncSession,
    request: Request,
    media_section: MediaSection = MediaSection.kp
) -> List[ProductResponseSchema]:
    result = await session.execute(
        select(Product).options(selectinload(Product.user)).filter_by(user_sub=user_sub).order_by(Product.updated_at.desc())
    )
    products = result.scalars().all()

    response = []

    for product in products:
        media_result = await session.execute(
            select(Media).filter(Media.entity_id==product.id,
                                 Media.section == media_section)
        )
        media_objects = media_result.scalars().all()

        media_responses = []
        for media in media_objects:
            url_data = await generate_download_url(request, media.name)
            media_responses.append(MediaResponse(
                id=media.id,
                url=url_data["signed_url"],
                mime_type=media.mime_type,
                section=media.section,
                entity_id=media.entity_id,
                media_purpose=media.media_purpose,
                media_order=media.media_order
            ))

        response.append(ProductResponseSchema(
            id=product.id,
            name=product.name,
            description=product.description,
            user_name=product.user.name,
            user_surname=product.user.surname,
            price=product.price,
            category=product.category,
            condition=product.condition,
            status=product.status,
            updated_at=product.updated_at,
            created_at=product.created_at,
            media=media_responses
        ))

    return response



async def show_products_from_db(
    session: AsyncSession,
    size: int,
    page: int,
    request: Request,
    category: ProductCategory | None = None,
    condition: ProductCondition | None = None,
    media_section: MediaSection = MediaSection.kp
) -> ListResponseSchema:
    offset = size * (page - 1)
    sql_conditions = [Product.status == ProductStatus.active]

    if category:
        sql_conditions.append(Product.category == category)
    if condition:
        sql_conditions.append(Product.condition == condition)

    # Count total products
    total_query = select(func.count()).where(*sql_conditions)
    total_result = await session.execute(total_query)
    total_count = total_result.scalar()
    num_of_pages = max(1, (total_count + size - 1) // size)

    query = (
        select(Product)
        .options(selectinload(Product.user))  # this is the fix
        .where(*sql_conditions)
        .offset(offset)
        .limit(size)
        .order_by(Product.updated_at.desc())
    )
    result = await session.execute(query)
    products = result.scalars().all()
    response = []


    for product in products:
        media_result = await session.execute(
            select(Media).filter(Media.entity_id == product.id,
                                 Media.section == media_section)
        )
        media_objects = media_result.scalars().all()

        media_responses = []
        for media in media_objects:
            url_data = await generate_download_url(request, media.name)
            media_responses.append(MediaResponse(
                id=media.id,
                url=url_data["signed_url"],
                mime_type=media.mime_type,
                section=media.section,
                entity_id=media.entity_id,
                media_purpose=media.media_purpose,
                media_order=media.media_order
            ))

        response.append(ProductResponseSchema(
            id=product.id,
            name=product.name,
            description=product.description,
            user_name=product.user.name,
            user_surname=product.user.surname,
            price=product.price,
            category=product.category,
            condition=product.condition,
            status=product.status,
            updated_at=product.updated_at,
            created_at=product.created_at,
            media=media_responses
        ))

    return ListResponseSchema(products=response, num_of_pages=num_of_pages)

async def get_product_from_db(
        request:Request,
        product_id: int,
        session: AsyncSession,
        media_section: MediaSection = MediaSection.kp
):
    product = await session.execute(select(Product).options(selectinload(Product.user)).filter(Product.id == product_id, Product.status == ProductStatus.active))
    product = product.scalars().first()
    if product:
        media_result = await session.execute(
                select(Media).filter(Media.entity_id == product.id,
                                     Media.section == media_section)
            )
        media_objects = media_result.scalars().all()
        media_responses = []
        for media in media_objects:
            url_data = await generate_download_url(request, media.name)
            media_responses.append(MediaResponse(
                id=media.id,
                url=url_data["signed_url"],
                mime_type=media.mime_type,
                section=media.section,
                entity_id=media.entity_id,
                media_purpose=media.media_purpose,
                media_order=media.media_order
            ))
        return ProductResponseSchema(
                id=product.id,
                name=product.name,
                description=product.description,
                user_name=product.user.name,
                user_surname=product.user.surname,
                price=product.price,
                category=product.category,
                condition=product.condition,
                status=product.status,
                updated_at=product.updated_at,
                created_at=product.created_at,
                media=media_responses
            )

#update
async def update_product_from_database(product_id: int, product_schema: ProductRequestSchema, session:AsyncSession):
    result = await session.execute(select(Product).filter_by(id = product_id))
    product = result.scalars().first()

    if product:
        for key, value in product_schema.model_dump().items():
            setattr(product, key, value)
    else:
        return False
    await session.commit()
    await session.refresh(product)
    return product

async def remove_product_from_db(
        request: Request,
        user_sub: str,
        product_id: int,
        session: AsyncSession
):
    result = await session.execute(select(Product).filter(Product.id==product_id, Product.user_sub == user_sub))
    product = result.scalars().first()
    if product:
        media_result = await session.execute(
            select(Media).filter(Media.entity_id == product.id,
                                 Media.section == MediaSection.kp)
        )
        media_objects = media_result.scalars().all()
        for media in media_objects:
            await delete_bucket_object(request, media.name)
            await session.delete(media)
        await session.delete(product)
        await session.commit()
        await remove_meilisearch_data(storage_name='products', object_id=str(product_id))



async def update_product_in_db(
        product_update: ProductUpdateSchema,
        user_sub: str,
        session: AsyncSession):
    result = await session.execute(
        select(Product)
        .where(
            Product.id == product_update.product_id,
            Product.user_sub == user_sub)
    )
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Directly assign the status instead of using setattr
    if product_update.name is not None:
        product.name = product_update.name
        await update_meilisearch_data(storage_name="products",
                                      json_values={"id": product_update.product_id, "name": product.name})
    if product_update.description is not None:
        product.description = product_update.description
    if product_update.price is not None:
        product.price = product_update.price
    if product_update.status is not None:
        product.status = product_update.status
    if product_update.condition is not None:
        product.condition = product_update.condition
    if product_update.category is not None:
        product.category = product_update.category
    await session.commit()
    await session.refresh(product)

    return product_update