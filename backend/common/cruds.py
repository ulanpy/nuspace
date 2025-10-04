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
    A reusable query builder and repository for SQLAlchemy AsyncSession.

    This class provides a fluent, chainable interface to build and execute
    SQLAlchemy queries, simplifying common CRUD operations and reducing
    boilerplate code. It is designed to handle straightforward queries involving
    filtering, joining, ordering, and pagination on a single primary model.

    Core Concerns Handled:
    - **Filtering:** Dynamically add WHERE clauses.
    - **Joins:** Simple INNER JOINs based on relationships.
    - **Eager Loading:** Efficiently load related entities to prevent N+1 problems.
    - **Ordering:** Apply single or multiple ORDER BY clauses.
    - **Pagination:** Simple offset/limit based pagination.
    - **Attribute Selection:** Select specific columns instead of the whole model.
    - **Soft Deletes:** Automatically filters for records that are not soft-deleted if configured.
    - **Mutations:** Provides simple methods for adding, updating, and deleting records.

    When to Use:
    Use this builder for standard, everyday queries that fit the common patterns
    listed above.

    When NOT to Use (use raw SQLAlchemy instead):
    - Queries requiring complex aggregations (GROUP BY).
    - Queries needing outer joins (LEFT/RIGHT JOIN).
    - Subqueries.
    - Window functions or other advanced SQL features.

    @example
        #
        # >>> qb = QueryBuilder(db_session, User)
        # >>> users = await (
        # ...     qb.base()
        # ...     .filter(User.status == "active", User.is_verified == True)
        # ...     .eager(User.profile)
        # ...     .order(User.created_at.desc())
        # ...     .paginate(size=10, page=1)
        # ...     .all()
        # ... )
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
        self._group_by: List[ColumnElement] = []

    # —— READ QUERIES —— #
    def base(self, count: bool = False) -> "QueryBuilder":
        """
        Initializes a new select statement.

        This is the starting point for any read query.

        @param count - If True, initializes a `COUNT(*)` query instead of a SELECT.
        """
        self._is_count = count
        return self

    def filter(self, *conditions: Optional[ColumnElement]) -> "QueryBuilder":
        """
        Adds one or more WHERE clauses to the query, joined by AND.

        @param conditions - A list of SQLAlchemy column conditions.
        @example
            # .filter(User.name == "John", User.age > 30)
        """
        for cond in conditions:
            if cond is not None:
                self._filters.append(cond)
        return self

    def join(self, *targets: Optional[DeclarativeBase]) -> "QueryBuilder":
        """
        Adds an INNER JOIN to the query.

        The join condition is inferred by SQLAlchemy from the model relationships.

        @param targets - The relationship attribute to join on.
        @example
            # .join(User.profile)
        """
        for t in targets:
            if t is not None:
                self._joins.append(t)
        return self

    def eager(self, *relationships: Optional[InstrumentedAttribute]) -> "QueryBuilder":
        """
        Adds a `selectinload` option to eagerly load a relationship.

        This helps prevent the N+1 query problem by loading related objects
        in the same query.

        @param relationships - The relationship attributes to load.
        @example
            # .eager(Ticket.author, Ticket.conversations)
        """
        for rel in relationships:
            if rel is not None:
                self._options.append(selectinload(rel))
        return self

    def option(self, *opts: Any) -> "QueryBuilder":
        """Adds an arbitrary loader option to the query (e.g., for chained eager loads)."""
        for opt in opts:
            if opt is not None:
                self._options.append(opt)
        return self

    def order(self, *clauses: Optional[ColumnElement]) -> "QueryBuilder":
        """
        Adds one or more ORDER BY clauses to the query.

        @param clauses - A list of SQLAlchemy columns with ordering (e.g., .asc(), .desc()).
        @example
            # .order(User.created_at.desc(), User.name.asc())
        """
        for c in clauses:
            if c is not None:
                self._order_by.append(c)
        return self

    def group_by(self, *clauses: Optional[ColumnElement]) -> "QueryBuilder":
        """
        Adds one or more GROUP BY clauses to the query.

        @param clauses - A list of SQLAlchemy columns to group by.
        @example
            # .group_by(User.status)
        """
        for c in clauses:
            if c is not None:
                self._group_by.append(c)
        return self

    def attributes(self, *entities: Any) -> "QueryBuilder":
        """
        Selects specific model attributes or columns instead of the full model.

        If called with no arguments, it reverts to selecting the full model.

        @param entities - The columns or attributes to select.
        @example
            # .attributes(User.id, User.email)
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
        """
        Applies pagination (LIMIT/OFFSET) to the query.

        @param size - The number of items per page.
        @param page - The page number to retrieve.
        """
        self._size = size
        self._page = page
        return self

    async def all(self) -> List[Any]:
        """
        Execute and return list of results.

        - If multiple entities were selected via `.attributes()` (e.g.,
          `.attributes(User.id, User.name)`), returns a List of `sqlalchemy.engine.Row`.
        - If a single entity was selected via `.attributes()` (e.g.,
          `.attributes(User.id)`), or if no attributes were specified (default),
          returns a direct list of those items (e.g., `List[int]`, `List[User]`).
        - If the query was for a count (`.base(count=True)`), returns a list
          containing a single number: `[count_value]`.
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
        Executes the query and returns the first result, or None if no result is found.
        """
        results = await self.all()
        return results[0] if results else None

    async def count(self) -> int:
        """
        Executes the query as a `COUNT` and returns the total number of rows.
        """
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

        for g in self._group_by:
            stmt = stmt.group_by(g)

        for o in self._order_by:
            stmt = stmt.order_by(o)
        return stmt

    # —— MUTATIONS —— #
    async def add(
        self,
        data: Union[BaseModel, List[BaseModel]],
        preload: Optional[List[InstrumentedAttribute]] = None,
    ) -> Union[DeclarativeBase, List[DeclarativeBase]]:
        """
        Adds new record(s) to the database from Pydantic model(s).

        @param data - The Pydantic model instance or list of instances containing the data.
        @param preload - A list of relationships to eagerly load on the new instance(s).
        @return The newly created SQLAlchemy model instance(s).
        """
        if isinstance(data, list):
            # Handle list of BaseModel instances
            instances = [self.model(**item.model_dump()) for item in data]
            self.session.add_all(instances)
            await self.session.commit()
            
            # Refresh all instances to get their IDs
            for instance in instances:
                await self.session.refresh(instance)
            
            # If preload is specified, reload instances with relationships
            if preload and instances:
                pk = list(self.model.__table__.primary_key)[0]
                instance_ids = [getattr(instance, pk.name) for instance in instances]
                stmt = select(self.model).where(pk.in_(instance_ids))
                for rel in preload:
                    stmt = stmt.options(selectinload(rel))
                result = await self.session.execute(stmt)
                instances = result.scalars().all()
            return instances
        else:
            # Handle single BaseModel instance (backward compatibility)
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

    async def add_orm_list(
        self, 
        instances: List[DeclarativeBase], 
        preload: Optional[List[InstrumentedAttribute]] = None
    ) -> List[DeclarativeBase]:
        """
        Adds multiple new records to the database in a single transaction.

        @param instances - A list of SQLAlchemy model instances to add.
        @param preload - A list of relationships to eagerly load on the new instances.
        @return The list of newly created instances with preloaded relationships.
        """
        self.session.add_all(instances)
        await self.session.commit()
        
        # Refresh all instances to get their IDs
        for instance in instances:
            await self.session.refresh(instance)
        
        # If preload is specified, reload instances with relationships
        if preload and instances:
            # Get primary key column name
            pk = list(self.model.__table__.primary_key)[0]
            
            # Get all primary key values
            pk_values = [getattr(instance, pk.name) for instance in instances]
            
            # Build query to reload instances with preloaded relationships
            stmt = select(self.model).where(pk.in_(pk_values))
            for rel in preload:
                stmt = stmt.options(selectinload(rel))
            
            result = await self.session.execute(stmt)
            instances = result.scalars().all()
        
        return instances

    async def update(
        self,
        instance: DeclarativeBase,
        update_data: BaseModel,
        exclude_unset: bool = True,
        preload: Optional[List[RelationshipProperty]] = None,
    ) -> DeclarativeBase:
        """
        Updates an existing record with fields from a Pydantic model.

        @param instance - The SQLAlchemy model instance to update.
        @param update_data - The Pydantic model with updated values.
        @param exclude_unset - If True, only fields explicitly set in the model are updated.
        @param preload - A list of relationships to eagerly load on the updated instance.
        @return The updated SQLAlchemy model instance.
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
        Deletes one or more records from the database.

        @param target - A single model instance or a list of instances to delete.
        @return True if deletion was successful, False otherwise.
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
        """
        Deletes records that match a specific condition.

        @param conditions - A SQLAlchemy condition to select rows for deletion.
        @example
            # .conditional_delete(User.status == "inactive")
        """
        await self.session.execute(delete(self.model).where(conditions))
        await self.session.commit()

    def blank(self, model: Optional[Type[DeclarativeBase]] = None) -> "QueryBuilder":
        """
        Creates a new, empty QueryBuilder instance with the same session.

        This is useful for creating a fresh query (e.g., for a count) without
        the filters and options of the current instance.

        @param model - Optionally, the new builder can be for a different model.
        """
        return QueryBuilder(self.session, model or self.model)
