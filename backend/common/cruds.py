import aioredis
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import insert
from sqlalchemy import select, func, delete, insert, update, bindparam
from sqlalchemy.dialects.postgresql import insert as pg_insert

from backend.core.database.models.view import ClubView
from backend.core.database.models.product import Product

# Initialize Redis connection
r = aioredis.from_url("redis://localhost")


async def increment_pg_views(session: AsyncSession):
    """
    Update unique views periodically while keeping Redis unique and shadow keys in sync (without strict atomicity)

    """

    unique_keys = await r.keys("unique_views:*")
    values = []
    for unique_key in unique_keys:
        parts = unique_key.decode().split(":")
        entity_type, entity_id = parts[1], int(parts[2])
        shadow_key = f"prev_unique_views:{entity_type}:{entity_id}"
        try:
            current_count = await r.scard(unique_key)
            prev_count = await r.get(shadow_key)

            current_count = int(current_count) if current_count is not None else 0
            prev_count = int(prev_count) if prev_count is not None else 0
            delta_views = max(0, current_count - prev_count)

            # Update the previous count (Shadow key) with the new value
            ttl = await r.ttl(shadow_key)
            await r.set(shadow_key, current_count)
            await r.expire(shadow_key, ttl)


            # Add the current entity's data to the values list for batch insert to PG
            values.append({
                "entity_id": entity_id,
                "entity_type": entity_type,
                "views": delta_views,
            })

        except Exception as e:
            print(f"Error updating views for {unique_key}: {e}")

    # Batch upsert PostgreSQL if there are values to update
    if values:
        stmt = pg_insert(ClubView).values(values)
        stmt = stmt.on_conflict_do_update(
            index_elements=["entity_id", "entity_type"],
            set_={
                "views": ClubView.views + bindparam("views")
            }
        )
        await session.execute(stmt)
        await session.commit()

async def show_products(session: AsyncSession, size: int, page:int):
    offset = size * (page - 1)
    products = await session.query(Product).offset(offset).limit(size).all()
    return products
