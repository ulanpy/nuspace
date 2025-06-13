from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database.models.product import Product
from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_db_session



async def product_exists_or_404(
    product_id: int,
    db_session: AsyncSession = Depends(get_db_session),
) -> Product:
    qb = QueryBuilder(session=db_session, model=Product)
    product = await qb.blank(model=Product).base().eager(Product.user).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product