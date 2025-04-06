from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from backend.core.database.models.product import Product, ProductCategory
from backend.core.database.models.media import Media
from backend.core.database.models.product import *
from backend.routes.kupiprodai.schemas import *
from backend.common.utils import add_meilisearch_data
from typing import Literal
from backend.core.database.models.product import ProductStatus
from backend.common.utils import update_meilisearch_data


async def add_new_product_to_db(
        session: AsyncSession,
        product_data: ProductSchema,
        user_sub: str
) -> Product:
    new_product = Product(**product_data.dict(), user_sub=user_sub)
    session.add(new_product)
    await session.commit()
    await session.refresh(new_product)
    return new_product


async def show_products_from_db(
    session: AsyncSession,
    size: int,
    page: int,
    category: ProductCategory | None = None,
    condition: ProductCondition | None = None
):
    offset = size * (page - 1)
    sql_conditions = [Product.status == ProductStatus.active]

    if category:
        sql_conditions.append(Product.category == category)
    if condition:
        sql_conditions.append(Product.condition == condition)

    query = (
        select(Product)
        .where(*sql_conditions)
        .offset(offset)
        .limit(size)
        .order_by(Product.updated_at.desc())
    )
    result = await session.execute(query)
    products = result.scalars().all()
    return products

async def get_products_of_user_from_db(
        user_sub: str,
        session: AsyncSession
):
    # Use the enum member 'status' directly instead of 'status.value'
    result = await session.execute(select(Product).filter_by(user_sub=user_sub).order_by(Product.updated_at.desc()))
    products = result.scalars().all()
    return products


async def get_product_from_db(product_id: int, session: AsyncSession):
    product = await session.execute(select(Product).filter_by(id=product_id))
    return product.scalars().first()

#update
async def update_product_from_database(product_id: int, product_schema: ProductSchema, session:AsyncSession):
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

#delete
async def remove_product_from_db(product_id: int, session: AsyncSession):
    result = await session.execute(select(Product).filter_by(id=product_id))
    product = result.scalars().first()
    if product:
        await session.delete(product)
        await session.commit()
        return True
    else:
        return False

async def update_product_in_db(product_id: int, product_update: ProductUpdateSchema, session: AsyncSession):
    result = await session.execute(select(Product).where(Product.id == product_id))
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Directly assign the status instead of using setattr
    if product_update.name is not None:
        product.name = product_update.name
        await update_meilisearch_data(storage_name="products",
                                      json_values={"id": product_id, "name": product.name})
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
    query = (
        select(ProductFeedback)
        .filter_by(product_id = product_id)
        .offset(offset)
        .limit(size)
        .order_by(ProductFeedback.created_at.desc())
    )
    result = await session.execute(query)
    product_feedbacks = result.scalars().all()
    return product_feedbacks

async def remove_product_feedback_from_db(feedback_id: int, session: AsyncSession):
    result = await session.execute(select(ProductFeedback).filter_by(product_id = feedback_id))
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