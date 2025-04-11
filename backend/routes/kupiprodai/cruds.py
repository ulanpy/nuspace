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
from .utils import build_product_response, build_product_feedbacks_response
import asyncio
from .schemas import *
from backend.core.database.models.product import *


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
    return await build_product_response(new_product, session, request, media_section)


async def get_products_of_user_from_db(
    user_sub: str,
    session: AsyncSession,
    request: Request,
    media_section: MediaSection = MediaSection.kp
) -> List[ProductResponseSchema]:
    query = (
        select(Product)
        .options(selectinload(Product.user))
        .filter_by(user_sub=user_sub)
        .order_by(Product.updated_at.desc())
    )
    result = await session.execute(query)
    products = result.scalars().all()

    # Собираем ответ для каждого продукта
    return list(await asyncio.gather(*(build_product_response(product, session, request, media_section)
                                  for product in products)))


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

    # Подсчет общего числа продуктов
    total_query = select(func.count()).where(*sql_conditions)
    total_result = await session.execute(total_query)
    total_count = total_result.scalar()
    num_of_pages = max(1, (total_count + size - 1) // size)

    query = (
        select(Product)
        .options(selectinload(Product.user))
        .where(*sql_conditions)
        .offset(offset)
        .limit(size)
        .order_by(Product.updated_at.desc())
    )
    result = await session.execute(query)
    products = result.scalars().all()

    # Собираем ответы для всех продуктов
    products_response = await asyncio.gather(*(build_product_response(product, session, request, media_section)
                                                for product in products))
    return ListResponseSchema(products=products_response, num_of_pages=num_of_pages)


async def get_product_from_db(
    request: Request,
    product_id: int,
    session: AsyncSession,
    media_section: MediaSection = MediaSection.kp
) -> ProductResponseSchema:
    query = (
        select(Product)
        .options(selectinload(Product.user))
        .filter(Product.id == product_id, Product.status == ProductStatus.active.value)
    )
    result = await session.execute(query)
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return await build_product_response(product, session, request, media_section)


async def update_product_from_database(
    product_id: int,
    product_schema: ProductRequestSchema,
    session: AsyncSession
):
    result = await session.execute(select(Product).filter_by(id=product_id))
    product = result.scalars().first()
    if not product:
        return False
    for key, value in product_schema.model_dump().items():
        setattr(product, key, value)
    await session.commit()
    await session.refresh(product)
    return product


async def remove_product_from_db(
    request: Request,
    user_sub: str,
    product_id: int,
    session: AsyncSession
):
    query = select(Product).filter(Product.id == product_id, Product.user_sub == user_sub)
    result = await session.execute(query)
    product = result.scalars().first()
    if product:
        # Удаляем связанные media
        media_result = await session.execute(
            select(Media).filter(Media.entity_id == product.id, Media.section == MediaSection.kp)
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
    session: AsyncSession
):
    query = (
        select(Product)
        .where(Product.id == product_update.product_id, Product.user_sub == user_sub)
    )
    result = await session.execute(query)
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

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

async def add_new_product_feedback_to_db(
        feedback_data: ProductFeedbackSchema, 
        user_sub: str, 
        session: AsyncSession
    ) -> ProductFeedback:
    new_feedback = ProductFeedback(**feedback_data.dict(), user_sub=user_sub)
    session.add(new_feedback)
    await session.commit()
    await session.refresh(new_feedback)
    return new_feedback

async def get_product_feedbacks_from_db(
        product_id: int, 
        session: AsyncSession, 
        size: int = 20, 
        page: int = 1
    ):
    offset = size * (page - 1)
    sql_conditions = [ProductFeedback.product_id == product_id]

    total_query = select(func.count()).where(*sql_conditions)
    total_result = await session.execute(total_query)
    total_count = total_result.scalar()
    num_of_pages = max(1, (total_count + size - 1) // size)
    
    query = (
        select(ProductFeedback)
        .filter_by(product_id = product_id)
        .offset(offset)
        .limit(size)
        .order_by(ProductFeedback.created_at.desc())
    )
    result = await session.execute(query)
    product_feedbacks = result.scalars().all()
    product_feedbacks_response = await asyncio.gather(*(build_product_feedbacks_response(feedback = feedback)
                                                for feedback in product_feedbacks))
    return ListProductFeedbackResponseSchema(product_feedbacks=product_feedbacks_response, num_of_pages=num_of_pages)

async def remove_product_feedback_from_db(feedback_id: int, user_sub: str, session: AsyncSession):
    result = await session.execute(select(ProductFeedback).filter_by(product_id = feedback_id, user_sub = user_sub))
    product_feedback = result.scalars().first()
    if product_feedback:
        await session.delete(product_feedback)
        await session.commit()
        return True
    else:
        return False

async def add_product_report(report_data: ProductReportSchema, user_sub: str, session: AsyncSession):
    new_report = ProductReport(**report_data.dict(), user_sub=user_sub)
    session.add(new_report)
    await session.commit()
    await session.refresh(new_report)
    return new_report