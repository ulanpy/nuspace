from typing import List, Optional, Type, Union

from pydantic import BaseModel
from sqlalchemy import and_, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase, RelationshipProperty, selectinload
from sqlalchemy.sql.elements import BinaryExpression


class QueryBuilder:
    """
    A reusable query builder and repository for SQLAlchemy AsyncSession that supports:
    - Filtering
    - Joining
    - Eager loading
    - Ordering
    - Pagination
    - Counting
    - Fetching single or multiple results
    - Adding, updating, and deleting records
    """

    def __init__(
        self,
        session: AsyncSession,
        model: Type[DeclarativeBase],
        soft_delete_field: Optional[RelationshipProperty] = None,
    ):
        self.session = session
        self.model = model
        # default filters (e.g. soft-delete)
        self._filters: List[BinaryExpression] = []
        if soft_delete_field is not None:
            self._filters.append(soft_delete_field.is_(None))
        self._joins: List[DeclarativeBase] = []
        self._options: List = []
        self._order_by: List[BinaryExpression] = []
        self._size: Optional[int] = None
        self._page: Optional[int] = None
        self._is_count: bool = False

    # —— READ QUERIES —— #
    def base(self, count: bool = False) -> "QueryBuilder":
        """Initialize select statement; use count=True for count query"""
        self._is_count = count
        return self

    def filter(self, *conditions: Optional[BinaryExpression]) -> "QueryBuilder":
        """Add WHERE clauses"""
        for cond in conditions:
            if cond is not None:
                self._filters.append(cond)
        return self

    def join(self, *targets: Optional[DeclarativeBase]) -> "QueryBuilder":
        """Add JOINs"""
        for t in targets:
            if t is not None:
                self._joins.append(t)
        return self

    def eager(self, *relationships: Optional[RelationshipProperty]) -> "QueryBuilder":
        """Add eager-load options (selectinload)"""
        for rel in relationships:
            if rel is not None:
                self._options.append(selectinload(rel))
        return self

    def order(self, *clauses: Optional[BinaryExpression]) -> "QueryBuilder":
        """Add ORDER BY clauses"""
        for c in clauses:
            if c is not None:
                self._order_by.append(c)
        return self

    def paginate(self, size: Optional[int], page: Optional[int]) -> "QueryBuilder":
        """Set pagination parameters"""
        self._size = size
        self._page = page
        return self

    async def all(self) -> List[DeclarativeBase]:
        """Execute and return list of results"""
        stmt = self._build_select()
        if not self._is_count and self._size:
            page = max(1, (self._page or 1))
            stmt = stmt.offset((page - 1) * self._size).limit(self._size)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def first(self) -> Optional[DeclarativeBase]:
        """Execute and return the first result"""
        results = await self.all()
        return results[0] if results else None

    async def count(self) -> int:
        """Execute a count query and return the total count"""
        self._is_count = True
        stmt = self._build_select()
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    def _build_select(self):
        """Compose the SQLAlchemy Select statement"""
        if self._is_count:
            pk = self.model.__table__.primary_key.columns.values()[0]
            stmt = select(func.count(pk))
        else:
            stmt = select(self.model)

        if self._filters:
            stmt = stmt.where(and_(*self._filters))
        for t in self._joins:
            stmt = stmt.join(t)
        for opt in self._options:
            stmt = stmt.options(opt)
        for o in self._order_by:
            stmt = stmt.order_by(o)
        return stmt

    # —— MUTATIONS —— #
    async def add(
        self,
        data: BaseModel,
        preload: Optional[List[RelationshipProperty]] = None,
    ) -> DeclarativeBase:
        """
        Add a new record and optionally preload relationships.
        """
        instance = self.model(**data.model_dump())
        self.session.add(instance)
        await self.session.commit()
        await self.session.refresh(instance)

        if preload:
            pk = self.model.__table__.primary_key.columns.values()[0]
            stmt = select(self.model).where(pk == getattr(instance, pk.name))
            for rel in preload:
                stmt = stmt.options(selectinload(rel))
            result = await self.session.execute(stmt)
            instance = result.scalars().first()
        return instance

    async def update(
        self,
        instance: DeclarativeBase,
        update_data: BaseModel,
        exclude_unset: bool = True,
    ) -> DeclarativeBase:
        """
        Update an existing record with fields from a Pydantic model.
        """
        data_dict = update_data.model_dump(exclude_unset=exclude_unset)
        for field, val in data_dict.items():
            if hasattr(instance, field):
                setattr(instance, field, val)
        await self.session.commit()
        await self.session.refresh(instance)
        return instance

    async def delete(
        self,
        target: Union[DeclarativeBase, List[DeclarativeBase]],
    ) -> bool:
        """
        Delete one or multiple records.
        """
        try:
            if isinstance(target, list):
                for obj in target:
                    await self.session.delete(obj)
            else:
                await self.session.delete(target)
            await self.session.commit()
            return True
        except Exception:
            await self.session.rollback()
            return False

    async def conditional_delete(self, conditions: Optional[BinaryExpression]):
        await self.session.execute(delete(self.model).where(conditions))
        await self.session.commit()
