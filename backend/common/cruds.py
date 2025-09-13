from typing import Any, List, Optional, Type, Union

from pydantic import BaseModel
from sqlalchemy import and_, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import (
    DeclarativeBase,
    InstrumentedAttribute,
    RelationshipProperty,
    selectinload,
)
from sqlalchemy.sql.elements import BinaryExpression, ColumnElement


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
        self._filters: List[ColumnElement] = []
        if soft_delete_field is not None:
            self._filters.append(soft_delete_field.is_(None))
        self._joins: List[DeclarativeBase] = []
        self._options: List = []
        self._order_by: List[ColumnElement] = []
        self._size: Optional[int] = None
        self._page: Optional[int] = None
        self._is_count: bool = False
        self._selected_entities: Optional[List[Any]] = None
        self._distinct: bool = False

    # —— READ QUERIES —— #
    def base(self, count: bool = False) -> "QueryBuilder":
        """Initialize select statement; use count=True for count query"""
        self._is_count = count
        return self

    def filter(self, *conditions: Optional[ColumnElement]) -> "QueryBuilder":
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

    def eager(self, *relationships: Optional[InstrumentedAttribute]) -> "QueryBuilder":
        """Add eager-load options (selectinload)"""
        for rel in relationships:
            if rel is not None:
                self._options.append(selectinload(rel))
        return self

    def order(self, *clauses: Optional[ColumnElement]) -> "QueryBuilder":
        """Add ORDER BY clauses"""
        for c in clauses:
            if c is not None:
                self._order_by.append(c)
        return self

    def attributes(self, *entities: Any) -> "QueryBuilder":
        """
        Specify specific model attributes, columns, or other selectable entities.
        Calling with no arguments clears any specific selection, reverting to selecting
        the full model.
        """
        if not entities:
            self._selected_entities = None
        else:
            self._selected_entities = list(entities)
        return self

    def distinct(self, *entities: Any) -> "QueryBuilder":
        """
        Add DISTINCT clause to the query. If entities are provided, select only those
        distinct entities. If no entities provided, applies DISTINCT to the current selection.
        """
        if entities:
            self._selected_entities = list(entities)
        self._distinct = True
        return self

    def paginate(self, size: Optional[int], page: Optional[int]) -> "QueryBuilder":
        """Set pagination parameters"""
        self._size = size
        self._page = page
        return self

    async def all(self) -> List[Any]:
        """
        Execute and return list of results.
        - If multiple entities were selected via .attributes() (e.g.,
          .attributes(User.id, User.name)), returns List[sqlalchemy.engine.Row].
        - If a single entity was selected via .attributes() (e.g.,
          .attributes(User.id) or .attributes(User)), or if .attributes() was not
          used (default, selecting the full model), returns a list of those items
          directly (e.g., List[int], List[User]).
        - If query was set for count (e.g. via .base(count=True)), returns a list
          containing the count [count_value].
        """
        stmt = self._build_select()
        if not self._is_count and self._size is not None:
            page = max(1, (self._page or 1))
            stmt = stmt.offset((page - 1) * self._size).limit(self._size)

        result = await self.session.execute(stmt)

        if self._is_count:
            # For count queries, scalars().all() correctly returns [count_value]
            return list(result.scalars().all())

        if self._selected_entities:
            if len(self._selected_entities) > 1:
                # Multiple entities selected (e.g., User.id, User.name) -> List[Row]
                return list(result.all())
            else:
                # Single entity selected (e.g., User.id or User) -> List[value] or
                # List[ModelInstance]
                return list(result.scalars().all())
        else:
            # Default: selecting full model instances -> List[ModelInstance]
            return list(result.scalars().all())

    async def first(self) -> Optional[Any]:
        """
        Execute and return the first result.
        The type of the returned item depends on what was selected and how .all()
        processes it. It could be a model instance, a sqlalchemy.engine.Row, a
        single attribute value, or the count.
        """
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
            pk = list(self.model.__table__.primary_key)[0]
            stmt = select(func.count(pk))
        else:
            if self._selected_entities:
                stmt = select(*self._selected_entities)
            else:
                stmt = select(self.model)

        # Apply DISTINCT if requested
        if self._distinct:
            stmt = stmt.distinct()

        if self._filters:
            stmt = stmt.where(and_(*self._filters))

        for t in self._joins:
            stmt = stmt.join(t)

        # Eager loading options only apply if we are selecting full model instances
        # and not specific columns/attributes.
        if not self._selected_entities and self._options:
            for opt in self._options:
                stmt = stmt.options(opt)

        for o in self._order_by:
            stmt = stmt.order_by(o)
        return stmt

    # —— MUTATIONS —— #
    async def add(
        self,
        data: BaseModel,
        preload: Optional[List[InstrumentedAttribute]] = None,
    ) -> DeclarativeBase:
        """
        Add a new record and optionally preload relationships.
        """
        instance = self.model(**data.model_dump())
        self.session.add(instance)
        await self.session.commit()
        await self.session.refresh(instance)

        if preload:
            pk = list(self.model.__table__.primary_key)[0]
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
        preload: Optional[List[RelationshipProperty]] = None,
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

        if preload:
            pk = self.model.__table__.primary_key.columns.values()[0]
            stmt = select(self.model).where(pk == getattr(instance, pk.name))
            for rel in preload:
                stmt = stmt.options(selectinload(rel))
            result = await self.session.execute(stmt)
            instance = result.scalars().first()
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
        except Exception as e:
            print(e)
            await self.session.rollback()
            return False

    async def conditional_delete(self, conditions: Optional[BinaryExpression]):
        await self.session.execute(delete(self.model).where(conditions))
        await self.session.commit()

    def blank(self, model: Optional[Type[DeclarativeBase]] = None) -> "QueryBuilder":
        return QueryBuilder(self.session, model or self.model)
