from enum import Enum
from typing import Type

import httpx
from backend.core.database.manager import AsyncDatabaseManager
from fastapi import Request
from sqlalchemy import select
from sqlalchemy.orm import DeclarativeBase

"""
    To search for data, first, you should add key-value pairs to Meilisearch;
    Do not forget to add id parameter to every pair inside the json_values;
    After the values were added, Meilisearch implements search among these values;
    Pass the previous storage_name you have used for adding data and keyword for searching;
    These functions will return status code and response data;
    The most 20 similar results will be returned inside 'hits' field of response data;
    You can change the number of most similar results;
    Use the id to get other values of the object.
"""


async def upsert(request: Request, storage_name: str, json_values: dict, primary_key: str = "id"):
    """
    Adds or updates a document in Meilisearch. If a document with the same primary key exists,
    it will be completely replaced. If it doesn't exist, a new document will be created.

    Args:
        request: The FastAPI request object containing the Meilisearch client
        storage_name: The name of the Meilisearch index
        json_values: The document to add/update
        primary_key: The primary key field name (defaults to 'id')

    Returns:
        The Meilisearch response as JSON

    Raises:
        ValueError: If the primary key is missing from the document
    """
    # Ensure primary key is present in the document
    if primary_key not in json_values:
        raise ValueError(f"Document must contain a '{primary_key}' field")

    response = await request.app.state.meilisearch_client.post(
        f"/indexes/{storage_name}/documents", json=json_values
    )
    return response.json()


async def get(
    request: Request,
    storage_name: str,
    keyword: str,
    filters: list | None = None,
    page: int = 0,
    size: int = 20,
) -> dict:
    """
    Search for documents in Meilisearch.

    Args:
        request: The FastAPI request object containing the Meilisearch client
        storage_name: The name of the Meilisearch index
        keyword: The keyword to search for
        filters: List of filters to apply
        page: The page number to return
        size: The number of results per page

    Returns:
        The Meilisearch response as JSON

    Example:
        filters = [f"status = {ProductStatus.active.value}"]
        result = await meilisearch.get(
            request=request,
            storage_name=EntityType.products.value,
            keyword="product name",
            filters=filters,
        )
    """
    payload = {"q": keyword, "limit": size, "offset": (page - 1) * size}
    if filters:
        payload["filter"] = filters

    response = await request.app.state.meilisearch_client.post(
        f"/indexes/{storage_name}/search", json=payload
    )
    return response.json()


async def delete(request: Request, storage_name: str, primary_key: str):
    response = await request.app.state.meilisearch_client.delete(
        f"indexes/{storage_name}/documents/{primary_key}"
    )
    return response.json()


async def sync_with_db(
    meilisearch_client: httpx.AsyncClient,
    storage_name: str,
    db_manager: AsyncDatabaseManager,
    model: Type[DeclarativeBase],
    columns_for_searching: list[str],
    primary_key: str = "id",
):
    async for session in db_manager.get_async_session():
        pk_column = getattr(model, primary_key)
        columns_to_select = [pk_column] + [getattr(model, col) for col in columns_for_searching]
        result = await session.execute(select(*columns_to_select))
        raw = result.mappings().all()  # list of RowMapping

        # === NEW: convert enums to plain values ===
        data = []
        for row in raw:
            doc = {}
            for key, val in row.items():
                if isinstance(val, Enum):
                    doc[key] = val.value
                else:
                    doc[key] = val
            data.append(doc)

        try:
            await meilisearch_client.delete(f"/indexes/{storage_name}")
            await meilisearch_client.post(
                "/indexes", json={"uid": storage_name, "primaryKey": primary_key}
            )
            await meilisearch_client.post(
                f"/indexes/{storage_name}/documents",
                json=data,
            )
        except Exception as e:
            print(f"Meilisearch error: {e}")  # now you’ll at least see any JSON‐encoding problems
