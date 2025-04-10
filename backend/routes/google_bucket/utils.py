from fastapi import Request, Depends, HTTPException, status
from typing import Annotated
from backend.common.dependencies import check_token
from datetime import timedelta
from google.cloud.exceptions import NotFound
from google.pubsub_v1.types import Subscription, PushConfig

async def generate_download_url(
    request: Request,
    filename: str,
):
    """
    Generates a signed download URL with:
    - 15 minute expiration
    - GET access only
    - Requires valid JWT
    """
    blob = request.app.state.storage_client.bucket(request.app.state.config.bucket_name).blob(filename)
    signed_url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=15),
        method="GET",
    )
    return {"signed_url": signed_url}

async def delete_bucket_object(
    request: Request,
    filename: str,
):
    blob = request.app.state.storage_client.bucket(request.app.state.config.bucket_name).blob(filename)
    try:
        blob.delete()
        return {"status": "success", "deleted": filename}
    except NotFound:
        raise HTTPException(status_code=404, detail="File not found")



from google.cloud import pubsub_v1
from backend.core.configs.config import config

def update_push_endpoint(new_url: str):
    client = pubsub_v1.SubscriberClient(credentials=config.bucket_credentials)
    subscription_path = client.subscription_path("responsive-city-389909", "gcs-object-created-sub")

    push_config = pubsub_v1.types.PushConfig(push_endpoint=new_url)

    # The field mask tells which fields we want to update (just push_config here)
    update_mask = {"paths": ["push_config"]}

    response = client.update_subscription(
        request={
            "subscription": {
                "name": subscription_path,
                "push_config": push_config,
            },
            "update_mask": update_mask,
        }
    )
    print(f"✅ Updated push endpoint to: {response.push_config.push_endpoint}")
