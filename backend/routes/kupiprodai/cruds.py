from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.core.database.models.product import Product, ProductPicture, ProductCategory
from backend.routes.kupiprodai.schemas import ProductPictureSchema, ProductSchema, ProductCategorySchema
from backend.common.utils import add_meilisearch_data

#create
async def add_new_product_to_database(session: AsyncSession, product_schema: ProductSchema):
    new_product = Product(**product_schema.model_dump())
    session.add(new_product)
    await session.commit()
    await session.refresh(new_product)
    return new_product

async def add_new_pictures(session: AsyncSession, product_picture_schemas: list[ProductPictureSchema]):
    new_pictures = [ProductPicture(**product_picture_schema.model_dump()) for product_picture_schema in product_picture_schemas]
    session.add_all(new_pictures)
    await session.commit()
    await session.refresh(new_pictures)
    return new_pictures

#Why to locate a function for showing the products in common folder? Does it make difference because Frontend can make a request to the backend to get the products
async def show_products(session: AsyncSession, size: int, page:int):
    offset = size * (page - 1)
    result = await session.execute(
        select(Product).offset(offset).limit(size)
    )
    products = result.scalars().all() 
    return products

#update
async def update_product(session:AsyncSession, product_schema: ProductSchema):
    product = await session.execute(select(Product).filter_by(id = product_schema.id)).scalars().first()
    if product:
        for key, value in product_schema.model_dump().items():
            setattr(product, key, value)
    else:
        return False
    await session.commit()
    await session.refresh(product)
    return product

#delete
async def remove_product(session: AsyncSession, product_schema: ProductSchema):
    product = await session.execute(select(Product).filter_by(id = product_schema.id)).scalars().first()
    if product:
        await session.delete(product)
        await session.commit()
        return True
    else:
        return False
    
async def remove_product_picture(session: AsyncSession, product_picture_schema: ProductPictureSchema):
    product_picture = await session.execute(select(ProductPicture).filter_by(id = product_picture_schema.id)).scalars().first()
    if product_picture:
        await session.delete(product_picture)
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

async def filter_products_by_category(session: AsyncSession, size: int, page: int, product_category_schema: ProductCategorySchema):
    offset = size * (page - 1)
    result = await session.execute(
        select(Product).filter_by(categoryId = product_category_schema.id).offset(offset).limit(size)
    )
    products = result.scalars().all()
    return products