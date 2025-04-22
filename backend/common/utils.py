from typing import Type

import httpx
from fastapi import Request
from sqlalchemy import select
from sqlalchemy.orm import DeclarativeBase

from backend.core.database.manager import AsyncDatabaseManager

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


async def add_meilisearch_data(request: Request, storage_name: str, json_values: dict):
    response = await request.app.state.meilisearch_client.post(
        f"/indexes/{storage_name}/documents", json=json_values
    )
    return response.json()


async def search_for_meilisearch_data(
    request: Request, storage_name: str, keyword: str, page: int = 0, size: int = 20
):
    response = await request.app.state.meilisearch_client.post(
        f"/indexes/{storage_name}/search",
        json={"q": keyword, "limit": size, "offset": (page - 1) * size},
    )
    return response.json()


async def remove_meilisearch_data(request: Request, storage_name: str, object_id: str):
    response = await request.app.state.meilisearch_client.delete(
        f"indexes/{storage_name}/documents/{object_id}"
    )
    return response.json()


async def update_meilisearch_data(
    request: Request, storage_name: str, json_values: dict
):
    response = await request.app.state.meilisearch_client.post(
        f"/indexes/{storage_name}/documents", json=json_values
    )
    return response.json()


async def import_data_from_db(
    meilisearch_client: httpx.AsyncClient,
    storage_name: str,
    db_manager: AsyncDatabaseManager,
    model: Type[DeclarativeBase],
    columns_for_searching: list[str],
):
    async for session in db_manager.get_async_session():
        result = await session.execute(
            select(*[getattr(model, col) for col in columns_for_searching])
        )
        data = [dict(row) for row in result.mappings().all()]
        await meilisearch_client.delete(f"/indexes/{storage_name}")
        await meilisearch_client.post(f"/indexes/{storage_name}/documents", json=data)
