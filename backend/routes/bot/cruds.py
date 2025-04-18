from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.core.database.models import User, Media
from backend.core.database.models.product import Product, ProductStatus
from backend.routes.kupiprodai import ProductResponseSchema


async def get_telegram_id(session: AsyncSession,
                          sub: str) -> int | None:
    result = await session.execute(select(User.telegram_id).filter_by(sub=sub))
    user_id: int | None = result.scalars().first()
    return user_id


async def check_existance_by_sub(session: AsyncSession,
                                 sub: str) -> bool:
    result = await session.execute(select(User.sub).filter_by(sub=sub))
    user = result.scalars().first()
    return True if user else False


async def set_telegram_id(session: AsyncSession,
                          sub: str,
                          user_id: int) -> int:
    result = await session.execute(select(User).filter_by(sub=sub))
    user = result.scalars().first()
    user.telegram_id = user_id
    await session.commit()
    return user_id


async def check_user_by_telegram_id(session: AsyncSession,
                                    user_id: int) -> bool:
    result = await session.execute(select(User.email).filter_by(telegram_id=user_id))
    user_email = result.scalars().first()
    return bool(user_email)


async def find_media(session: AsyncSession, product_id: int) -> Media | None:
    query = (
        select(Media).filter(Media.entity_id == product_id)
    )
    result = await session.execute(query)
    media = result.scalars().first()
    return media


async def find_product(session: AsyncSession, product_id: int) -> Product | None:
    query = (
        select(Product)
        .options(selectinload(Product.user))
        .filter(Product.id == product_id, Product.status == ProductStatus.active.value)
    )
    result = await session.execute(query)
    product = result.scalars().first()
    return product
