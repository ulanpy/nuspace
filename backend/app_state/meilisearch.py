import httpx
from fastapi import FastAPI
from google.cloud import storage

from backend.common.utils import import_data_from_db
from backend.core.configs.config import config
from backend.core.database.models import Product
from backend.routes.google_bucket.utils import update_bucket_push_endpoint


async def setup_meilisearch(app: FastAPI):
    app.state.storage_client = storage.Client(credentials=config.BUCKET_CREDENTIALS)
    app.state.meilisearch_client = httpx.AsyncClient(
        base_url=config.MEILISEARCH_URL,
        headers={"Authorization": f"Bearer {config.MEILISEARCH_MASTER_KEY}"},
    )

    update_bucket_push_endpoint()
    await import_data_from_db(
        meilisearch_client=app.state.meilisearch_client,
        storage_name="products",
        db_manager=app.state.db_manager,
        model=Product,
        columns_for_searching=["id", "name"],
    )


async def cleanup_meilisearch(app: FastAPI):
    client = getattr(app.state, "meilisearch_client", None)
    if client:
        await client.aclose()
