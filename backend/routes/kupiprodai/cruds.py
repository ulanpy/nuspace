from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.core.database.models.product import *
from backend.routes.kupiprodai.schemas import ProductSchema, ProductCategorySchema
from backend.common.utils import add_meilisearch_data
from typing import Literal
from backend.core.database.models.product import ProductStatus
import pytz

ConditionType = Literal['Used', 'New', 'Like New', 'Any']

#create
async def add_new_product_to_database(session: AsyncSession, product_schema: ProductSchema):
    new_product = Product(**product_schema.model_dump())
    session.add(new_product)
    await session.commit()
    await session.refresh(new_product)
    return new_product


#Why to locate a function for showing the products in common folder? Does it make difference because Frontend can make a request to the backend to get the products
async def show_products(categoryId: int | None,  session: AsyncSession, size: int, page:int, condition: ConditionType = 'Any'):
    offset = size * (page - 1)
    command = select(Product).offset(offset).limit(size)
    if categoryId:
        if condition != 'Any':
           command = select(Product).filter_by(categoryId = categoryId, condition = condition).offset(offset).limit(size)
        else:
            command = select(Product).filter_by(categoryId = categoryId).offset(offset).limit(size)
    elif condition != 'Any':
        command = select(Product).filter_by(condition = condition).offset(offset).limit(size)

    result = await session.execute(command)
    products = result.scalars().all() 
    return products

async def get_products_of_user_from_database(user_sub: int, status: ProductStatus, session: AsyncSession):
    result = await session.execute(select(Product).filter_by(user_sub = user_sub, status = status))
    products = result.scalars().all()
    return products


async def get_product_from_database(product_id: int, session: AsyncSession):
    product = await session.execute(select(Product).filter_by(id = product_id))
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
    setattr(product, "updated_at", datetime.now(pytz.timezone("Asia/Almaty")))
    await session.commit()
    await session.refresh(product)
    return product

#delete
async def remove_product_from_database(product_id: int, session: AsyncSession):
    result = await session.execute(select(Product).filter_by(id = product_id))
    product = result.scalars().first()
    if product:
        await session.delete(product)
        await session.commit()
        return True
    else:
        return False
    
async def add_new_product_category(session: AsyncSession, product_category_schema: ProductCategorySchema):
    new_category = Product(**product_category_schema.model_dump())
    session.add(new_category)
    await session.commit()
    await session.refresh(new_category)
    return new_category

async def remove_product_category(session: AsyncSession, product_category_schema: ProductCategorySchema):
    category = await session.execute(select(ProductCategory).filter_by(id = product_category_schema.id)).scalars().first()
    if category:
        await session.delete(category)
        await session.commit()
        return True
    else:
        return False
    
async def update_product_category(session: AsyncSession, product_category_schema: ProductCategorySchema):
    category = await session.execute(select(Product).filter_by(id = product_category_schema.id)).scalars().first()
    if category:
        for key, value in product_category_schema.model_dump().items():
            setattr(category, key, value)
    else:
        return False
    await session.commit()
    await session.refresh(category)
    return True

async def deactivate_product_in_database(product_id: int, session: AsyncSession):
    result = await session.execute(select(Product).filter_by(id = product_id))
    product = result.scalars().first()
    setattr(product, "status", ProductStatus.sold)
    setattr(product, "updated_at", datetime.now(pytz.timezone("Asia/Almaty")))
    await session.commit()
    await session.refresh(product)

async def activate_product_in_database(product_id: int, session: AsyncSession):
    result = await session.execute(select(Product).filter_by(id = product_id))
    product = result.scalars().first()
    setattr(product, "status", ProductStatus.active)
    setattr(product, "updated_at", datetime.now(pytz.timezone("Asia/Almaty")))

    await session.commit()
    await session.refresh(product)