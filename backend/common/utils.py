from sqlalchemy import select
from sqlalchemy.orm import DeclarativeBase
from typing import Type
import httpx

from backend.core.configs.config import config
from backend.core.database.manager import AsyncDatabaseManager


#meilisearch methods
async_client = httpx.AsyncClient(base_url = config.meilisearch_url, headers = {"Authorization": f"Bearer {config.meilisearch_master_key}"})

'''
    To search for data, first, you should add key-value pairs to Meilisearch;
    Do not forget to add id parameter to every pair inside the json_values;
    After the values were added, Meilisearch implements search among these values;
    Pass the previous storage_name you have used for adding data and keyword for searching;
    These functions will return status code and response data;
    The most 20 similar results will be returned inside 'hits' field of response data;
    You can change the number of most similar results;
    Use the id to get other values of the object.
'''
async def add_meilisearch_data(storage_name: str, json_values: dict):
    response = await async_client.post(f"/indexes/{storage_name}/documents", json = json_values)
    return {
        "status_code": response.status_code,
        "data": response.json() if response.status_code == 200 else response.text
    }  
 
async def search_for_meilisearch_data(storage_name: str, keyword: str):
    response = await async_client.post(f"/indexes/{storage_name}/search", json = {"q": keyword})
    return {
        "status_code": response.status_code,
        "data": response.json() if response.status_code == 200 else response.text
    } 

async def remove_meilisearch_data(storage_name: str, object_id: str):
    response = await async_client.delete(f"indexes/{storage_name}/documents/{object_id}")
    return {
        "status_code": response.status_code,
        "data": response.json() if response.status_code == 200 else response.text
    }    

async def update_meilisearch_data(storage_name: str, json_values: dict):
    response = await async_client.post(f"/indexes/{storage_name}/documents", json = json_values)
    return {
        "status_code": response.status_code,
        "data": response.json() if response.status_code == 200 else response.text
    }  

async def import_data_from_database(storage_name: str, db_manager: AsyncDatabaseManager, model: Type[DeclarativeBase], columns_for_searching: list[str]):
    async for session in db_manager.get_async_session(): 
        result = await session.execute(select(*[getattr(model, col) for col in columns_for_searching]))
        data = [dict(row) for row in result.mappings().all()]
        return await add_meilisearch_data(storage_name = storage_name, json_values=data)