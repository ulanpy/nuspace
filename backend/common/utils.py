from google.cloud import storage
from datetime import timedelta
from backend.core.configs.config import config

client = storage.Client()

def generate_url(blob_name: str, expiration: timedelta = timedelta(hours=1)):
    """
    Generate a signed URL for a given blob (file) in the GCS bucket.
    The URL will expire in the specified amount of time (default: 1 hour).
    """

    # Get the bucket and blob (object) from the bucket
    bucket = client.bucket(config.BUCKET_NAME)
    blob = bucket.blob(blob_name)

    # Generate the signed URL
    signed_url = blob.generate_signed_url(
        expiration=expiration,
        method="GET",  # This specifies the type of request (GET, PUT, etc.)
        version="v4"  # Using V4 signature
    )

    return signed_url


import aioredis


r = aioredis.from_url("redis://localhost")

async def track_view(entity_type: str, entity_id: int, user_id: int, TTL: int = 432000):
    """Tracks a unique user view using Redis with atomicity and TTL handling."""

    # Define main and shadow keys
    unique_key = f"unique_views:{entity_type}:{entity_id}"
    shadow_key = f"prev_unique_views:{entity_type}:{entity_id}"

    async with r.pipeline() as pipe:
        # Check if the unique_key already exists
        exists = await r.exists(unique_key)

        # Add user to the set
        await pipe.sadd(unique_key, user_id)

        if not exists:
            # If key is newly created, set TTL
            await pipe.expire(unique_key, TTL)
            await pipe.expire(shadow_key, TTL)  # close syncing with little delta


        # Execute the pipeline atomically
        await pipe.execute()

#meilisearch methods
import httpx
async_client = httpx.AsyncCLient(base_url = config.meilisearch_url, headers = {"Authorization": f"Bearer {config.meilisearch_master_key}"})

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

async def remove_meilisearch_data(storage_name: str):
    pass

async def update_meilisearch_data():
    pass