from typing import List, Optional, Type, Union

from pydantic import BaseModel
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase, RelationshipProperty, selectinload
from sqlalchemy.sql.elements import BinaryExpression

from backend.core.database.models.base import Base


async def get_resource_count(
    model: Type[Base], session: AsyncSession, conditions: List[BinaryExpression] | None = None
) -> int:
    """
    Generic count function for any model with optional filtering conditions.

    Parameters:
    - `model` (Type[Base]): SQLAlchemy model class to count records from
    - `session` (AsyncSession): Database session
    - `conditions` (List[BinaryExpression] | None): Optional list of SQLAlchemy filter conditions
        Example: [Model.field == value, Model.other_field.in_([1, 2, 3])]

    Returns:
    - `int`: Total count of records matching all conditions
    """
    # Build base query
    total_query = select(func.count(model.id))

    # Add conditions if provided
    if conditions:
        total_query = total_query.where(and_(*conditions))

    total_result = await session.execute(total_query)
    total_count: Optional[int] = total_result.scalar()

    return total_count or 0


async def get_resource_by_id(
    session: AsyncSession,
    model: Type[DeclarativeBase],
    resource_id: Union[int, str],
    conditions: List[BinaryExpression] | None = None,
    preload_relationships: List[RelationshipProperty] | None = None,
) -> DeclarativeBase | None:
    """
    Generic function to get a single resource by its ID with optional conditions and
    relationship preloading.

    Args:
        session: SQLAlchemy async session
        model: SQLAlchemy model class to query
        resource_id: Primary key ID of the resource to fetch (can be integer or string)
        conditions: Additional filter conditions beyond the ID match
        preload_relationships: List of SQLAlchemy relationship properties to eager load

    Returns:
        Single resource matching the ID and conditions, or None if not found

    Example:
        # Get by integer ID (e.g. product)
        product = await get_resource_by_id(session, Product, 123)

        # Get by string ID (e.g. user)
        user = await get_resource_by_id(session, User, "user_sub_123")

        # With conditions
        product = await get_resource_by_id(
            session,
            Product,
            123,
            conditions=[Product.status == ProductStatus.active]
        )
    """
    # Start with base query filtering by ID
    # Handle both string and integer IDs by checking the type of the primary key column
    pk_column = model.__table__.primary_key.columns.values()[0]
    query = select(model).filter(pk_column == resource_id)

    # Add additional conditions if provided
    if conditions:
        for condition in conditions:
            if condition is not None:
                query = query.filter(condition)

    # Add relationship loading if provided
    if preload_relationships:
        for relationship in preload_relationships:
            if relationship is not None:
                query = query.options(selectinload(relationship))

    # Execute query and return single result
    result = await session.execute(query)
    return result.scalars().first()


async def add_resource(
    session: AsyncSession,
    model: Type[DeclarativeBase],
    data: BaseModel,
    preload_relationships: Optional[List[RelationshipProperty]] = None,
) -> DeclarativeBase:
    """
    Generic function to add a new resource to the database with optional relationship preloading.

    Args:
        session: SQLAlchemy async session
        model: SQLAlchemy model class to create
        data: Pydantic model containing the data
        preload_relationships: List of SQLAlchemy relationship properties to eager load

    Returns:
        The created and optionally preloaded resource
    """
    # Create new resource
    new_resource = model(**data.model_dump())
    session.add(new_resource)
    await session.commit()
    await session.refresh(new_resource)

    # If relationships need to be preloaded, fetch the resource again with the relationships
    if preload_relationships:
        query = select(model).filter(model.id == new_resource.id)
        for relationship in preload_relationships:
            query = query.options(selectinload(relationship))

        result = await session.execute(query)
        new_resource = result.scalars().first()

    return new_resource


async def get_resources(
    session: AsyncSession,
    model: Type[DeclarativeBase],
    conditions: List[BinaryExpression | None] | None = None,
    preload_relationships: List[RelationshipProperty | None] | None = None,
    size: int | None = None,
    page: int | None = None,
    order_by: List[BinaryExpression | None] | None = None,
) -> List[DeclarativeBase | None]:
    """
    Generic function to get resources from the database with optional filtering, pagination,
    and relationship preloading.

    Args:
        session: SQLAlchemy async session
        model: SQLAlchemy model class to query
        conditions: List of SQLAlchemy filter conditions
        preload_relationships: List of SQLAlchemy relationship properties to eager load
        size: Number of items per page (if None, returns all items)
        page: Page number (1-indexed, only used if size is provided)
        order_by: List of SQLAlchemy order by expressions (e.g., [Model.created_at.desc()])

    Returns:
        List of resources matching the conditions with preloaded relationships
    """
    # Start with base query
    query = select(model)

    # Add conditions if provided
    if conditions:
        for condition in conditions:
            if condition is not None:  # Skip None conditions
                query = query.filter(condition)

    # Add relationship loading if provided
    if preload_relationships:
        for relationship in preload_relationships:
            if relationship is not None:  # Skip None relationships
                query = query.options(selectinload(relationship))

    # Add ordering if provided
    if order_by:
        for order in order_by:
            if order is not None:  # Skip None order clauses
                query = query.order_by(order)

    # Add pagination if size is provided
    if size is not None and size > 0:
        page = max(1, page or 1)  # Default to page 1 if not specified or invalid
        query = query.offset((page - 1) * size).limit(size)

    # Execute query and return results
    result = await session.execute(query)
    return list(result.scalars().all())


async def update_resource(
    session: AsyncSession,
    resource: DeclarativeBase,
    update_data: BaseModel,
    exclude_unset: bool = True,
) -> DeclarativeBase:
    """
    Generic function to update a resource with new data.

    Args:
        session: SQLAlchemy async session
        resource: The resource instance to update
        update_data: Pydantic model containing the update data
        exclude_unset: If True, only update fields that are explicitly set in update_data

    Returns:
        The updated resource

    Example:
        # Update a product
        updated_product = await update_resource(
            session=session,
            resource=product,
            update_data=product_update_schema
        )

        # Update a user, including unset fields
        updated_user = await update_resource(
            session=session,
            resource=user,
            update_data=user_update_schema,
            exclude_unset=False
        )
    """
    # Get the update data as a dict, excluding unset values if requested
    update_dict = update_data.model_dump(exclude_unset=exclude_unset)

    # Update only the fields that are present in the update data
    for field_name, new_value in update_dict.items():
        if hasattr(resource, field_name):
            setattr(resource, field_name, new_value)

    # Commit the changes and refresh the instance
    await session.commit()
    await session.refresh(resource)

    return resource


async def delete_resource(
    session: AsyncSession,
    resource: Union[DeclarativeBase, List[DeclarativeBase]],
) -> bool:
    """
    Generic function to delete one or more resources from the database.

    Args:
        session: SQLAlchemy async session
        resource: Single resource or list of resources to delete

    Returns:
        bool: True if deletion was successful, False otherwise

    Example:
        # Delete a single product
        success = await delete_resource(session, product)

        # Delete multiple products
        success = await delete_resource(session, [product1, product2, product3])
    """
    try:
        if isinstance(resource, list):
            for item in resource:
                await session.delete(item)
        else:
            await session.delete(resource)

        await session.commit()
        return True

    except Exception:
        await session.rollback()
        return False
