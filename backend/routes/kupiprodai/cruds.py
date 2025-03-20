from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.core.database.models.product import Product, ProductPicture
from backend.routes.kupiprodai.schemas import ProductPictureSchema, ProductSchema

#create
async def add_new_product(session: AsyncSession, product_schema: ProductSchema):
    new_product = Product(**product_schema.model_dump())
    session.add(new_product)

    await session.commit()
    await session.refresh(new_product)

    return new_product

async def add_new_pictures(session: AsyncSession, product_picture_schemas: list[ProductPictureSchema]):
    new_pictures = [ProductPicture(**product_picture_schema.model_dump()) for product_picture_schema in product_picture_schemas]
    session.add_all(new_pictures)
    await session.commit()

#Why to locate a function for showing the products in common folder? Does it make difference because Frontend can make a request to the backend to get the products
async def search(session: AsyncSession, keyword: str):
    pass
    #5 most similar results

#update
async def update(session:AsyncSession, product_schema: ProductSchema):
    product = await session.execute(select(Product).filter_by(id = product_schema.id)).scalars().first()
    if product:
        for key, value in product_schema.model_dump().items():
            setattr(product, key, value)
    else:
        return "The product was not found"
    await session.commit()
    await session.refresh(product)
    return {"message": "Product was successfully updated"}

#delete
async def remove_product(session: AsyncSession, product_schema: ProductSchema):
    product = await session.execute(select(Product).filter_by(id = product_schema.id)).scalars().first()
    if product:
        await session.delete(product)
        await session.commit()
        return {"message": "Product was successfully removed"}
    else:
        return {"error": "Product was not found"}
    
async def remove_product_picture(session: AsyncSession, product_picture_schema: ProductPictureSchema):
    product_picture = await session.execute(select(ProductPicture).filter_by(id = product_picture_schema.id)).scalars().first()
    if product_picture:
        await session.delete(product_picture)
        await session.commit()
        return {"message": "Product picture was successfully removed"}
    else:
        return {"error": "Product picture was not found"}