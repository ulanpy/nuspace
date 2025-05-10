import httpx
from fastapi import FastAPI
from google.cloud import storage
from sqlalchemy import select

from backend.core.configs.config import config
from backend.core.database.models.product import (
    Product,
    ProductStatus,
)
from backend.routes.google_bucket.utils import update_bucket_push_endpoint


async def setup_meilisearch(app: FastAPI):
    app.state.storage_client = storage.Client(credentials=config.BUCKET_CREDENTIALS)
    app.state.meilisearch_client = httpx.AsyncClient(
        base_url=config.MEILISEARCH_URL,
        headers={"Authorization": f"Bearer {config.MEILISEARCH_MASTER_KEY}"},
    )

    update_bucket_push_endpoint()
    async for session in app.state.db_manager.get_async_session():
        products = await session.execute(
            select(Product).filter(Product.status == ProductStatus.active.value)
        )
        data = []
        for product in products.scalars().all():
            data.append(
                {
                    "id": product.id,
                    "name": product.name,
                    "condition": product.condition.value,
                }
            )
        await app.state.meilisearch_client.delete("/indexes/products")
        await app.state.meilisearch_client.post(
            "/indexes/products/documents", json=data
        )
        response = await app.state.meilisearch_client.patch(
            "/indexes/products/settings",
            json={"filterableAttributes": ["condition", "status"]},
        )
    response.raise_for_status()
    print(response.json())


async def cleanup_meilisearch(app: FastAPI):
    client = getattr(app.state, "meilisearch_client", None)
    if client:
        await client.aclose()
