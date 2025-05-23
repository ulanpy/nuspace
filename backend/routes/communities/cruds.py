from typing import Dict, List, Type

from sqlalchemy import Column, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase


async def get_children_counts(
    session: AsyncSession, model: Type[DeclarativeBase], parent_field: Column, parent_ids: List[int]
) -> Dict[int, int]:
    """
    Получить количество дочерних объектов для каждого parent_id из списка parent_ids.
    Возвращает словарь: {parent_id: count}
    """
    if not parent_ids:
        return {}
    stmt = (
        select(parent_field, func.count(model.id))
        .where(parent_field.in_(parent_ids))
        .group_by(parent_field)
    )
    result = await session.execute(stmt)
    return dict(result.all())
