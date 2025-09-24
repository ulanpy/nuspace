from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_creds_or_401, get_db_session
from backend.core.database.models.product import Product
from backend.core.database.models.user import User
from backend.routes.kupiprodai import schemas


async def product_exists_or_404(
    product_id: int,
    db_session: AsyncSession = Depends(get_db_session),
) -> Product:
    qb = QueryBuilder(session=db_session, model=Product)
    product = (
        await qb.blank(model=Product)
        .base()
        .eager(Product.user)
        .filter(Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


async def user_exists_or_404(
    product_data: schemas.ProductRequest,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    db_session: AsyncSession = Depends(get_db_session),
) -> User:
    qb = QueryBuilder(session=db_session, model=User)
    if product_data.user_sub == "me":
        db_user = await qb.base().filter(User.sub == user[0]["sub"]).first()
    else:
        db_user = await qb.base().filter(User.sub == product_data.user_sub).first()
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user
